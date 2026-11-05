import { createHash } from "node:crypto";
import fs, { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  ACCEPTANCE_JOBS,
  PRODUCTION_WORKFLOW,
  RECOVERY_COMPATIBILITY_TEST,
  RECOVERY_RECEIPT_TTL_MS,
  RELEASE_STATE_VERSION,
  SOURCE_QA_SCOPES,
  appendOutputs,
  assertSourceQAReceipt,
  command,
  currentAlias,
  deployment,
  deploymentSourceSha,
  exactSha,
  fail,
  forwardOnlyNotice,
  github,
  json,
  loadState,
  moveProduction,
  nativeCompatibilityJob,
  positiveInteger,
  recoveryCompatibilityPlan,
  recoveryReceiptFacts,
  releaseOwnerContext,
  required,
  validateConfiguredPlatform,
  validateWorkflowRun,
  verifyRecoveryEvidence,
  verifyReusableSourceQA,
  workflowJobs,
  workflowRun,
  writeState,
} from "./core.js";

const DIGEST_PATTERN = /^sha256:([0-9a-f]{64})$/;
const CANDIDATE_LEGACY_ASSERTION = "candidate reads legacy persisted records";
const BASELINE_CANDIDATE_ASSERTION = (baselineSha) =>
  `production baseline ${baselineSha} reads candidate-written records`;

async function recordCompatibilityTest(state, plan) {
  if (!plan.required) return null;
  if (required("GITHUB_JOB") !== "recovery-receipt")
    fail("Compatibility proof must be recorded by the recovery receipt job");
  const { run, job } = await nativeCompatibilityJob(state);
  if (run.status !== "in_progress")
    fail("Compatibility proof must be recorded inside its active release run");
  return {
    runId: String(state.releaseRunId),
    runAttempt: String(state.releaseRunAttempt),
    jobId: String(job.id),
    path: RECOVERY_COMPATIBILITY_TEST,
    baselineSha: state.baseline.sha,
    sourceSha: state.sha,
    sourceTree: state.sourceQA.scopes.integration.testedTree,
    result: "success",
  };
}

async function verifyCompatibilityReport(state) {
  const baselineSha = exactSha(
    state.baseline.sha,
    "Compatibility test baseline SHA",
  );
  const report = json(
    await readFile(required("RELEASE_COMPATIBILITY_REPORT"), "utf8"),
    "Jest compatibility report",
  );
  const suites = report.testResults;
  if (!Array.isArray(suites) || suites.length !== 1)
    fail("Compatibility report must contain exactly one suite");
  const actualSuitePath = String(suites[0].name || "").replaceAll("\\", "/");
  if (
    actualSuitePath !== RECOVERY_COMPATIBILITY_TEST &&
    !actualSuitePath.endsWith(`/${RECOVERY_COMPATIBILITY_TEST}`)
  )
    fail("Compatibility report does not match the exact-source suite path");
  if (suites[0].status !== "passed") fail("Compatibility suite did not pass");
  if (
    !Number.isInteger(report.numPassedTests) ||
    report.numPassedTests !== 2 ||
    report.numTotalTests !== 2 ||
    report.numFailedTests !== 0 ||
    report.numPendingTests !== 0 ||
    report.numTodoTests !== 0
  )
    fail("Compatibility report contains missing, failing or skipped tests");

  const assertionResults = suites[0].assertionResults;
  const requiredAssertions = [
    CANDIDATE_LEGACY_ASSERTION,
    BASELINE_CANDIDATE_ASSERTION(baselineSha),
  ];
  if (
    !Array.isArray(assertionResults) ||
    assertionResults.length !== requiredAssertions.length
  )
    fail(
      "Compatibility report must contain exactly the two required assertions",
    );
  for (const title of requiredAssertions) {
    const matches = assertionResults?.filter((item) => item.title === title);
    if (matches?.length !== 1 || matches[0].status !== "passed")
      fail(`Compatibility report is missing a passing assertion: ${title}`);
  }
}

async function assertRollbackAllowed(
  state,
  expectedRunId = state.releaseRunId,
) {
  const receipt = await verifyRecoveryEvidence(state, expectedRunId);
  if (!receipt.facts.database.rollbackAllowed)
    fail(
      "Production code rollback is not supported by the recovery receipt: forward-only release, unknown or incompatible database state",
    );
}

function assertHealthySmoke(status, target) {
  if (status < 200 || status >= 300)
    fail(`${target} health check returned HTTP ${status}`);
}

export async function rollbackIfCompatible() {
  const state = await loadState({ allowRecovery: true });
  validateConfiguredPlatform(state);
  const candidate = await currentAlias();
  if (
    candidate.deploymentId !== state.candidateId ||
    candidate.sha !== state.sha
  )
    fail("Production alias changed; refusing rollback");
  await assertRollbackAllowed(state, state.recovery?.originalRunId);
  await moveProduction(
    `/v1/projects/${required("VERCEL_PROJECT_ID")}/rollback/${state.baseline.deploymentId}`,
    state.baseline,
    { deploymentId: state.candidateId, sha: state.sha },
  );
  const response = await fetch(`https://${required("PRODUCTION_ALIAS")}/`, {
    signal: AbortSignal.timeout(15_000),
  });
  assertHealthySmoke(response.status, "Rolled-back production baseline");
}

export async function recordRecoveryEvidence() {
  const state = await loadState();
  validateConfiguredPlatform(state);
  await verifySourceQANative(state);
  const plan = await recoveryCompatibilityPlan(state);
  if (plan.required) await verifyCompatibilityReport(state);
  state.compatibilityTest = await recordCompatibilityTest(state, plan);
  const facts = await recoveryReceiptFacts(state);
  const issuedAt = new Date().toISOString();
  state.recoveryEvidence = {
    schemaVersion: 2,
    runId: state.releaseRunId,
    runAttempt: state.releaseRunAttempt,
    facts,
    issuedAt,
    expiresAt: new Date(
      Date.parse(issuedAt) + RECOVERY_RECEIPT_TTL_MS,
    ).toISOString(),
  };
  await writeState(required("RELEASE_ACCEPTED_STATE_FILE"), state);
  const summary =
    `Machine-verified recovery receipt created for ${facts.repository} ` +
    `run ${facts.release.runId}/${facts.release.runAttempt}, source ${facts.release.sourceSha}, ` +
    `baseline ${facts.baseline.deploymentId}, candidate ${facts.candidate.deploymentId}; ` +
    `database policy ${facts.database.policy}, valid until ${state.recoveryEvidence.expiresAt}.` +
    forwardOnlyNotice(facts);
  if (process.env.GITHUB_STEP_SUMMARY)
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  process.stdout.write(`${summary}\n`);
}

async function verifySourceQANative(state) {
  assertSourceQAReceipt(state, state.releaseRunId);
  for (const [scope, reusedName] of SOURCE_QA_SCOPES) {
    const evidence = state.sourceQA.scopes[scope];
    await verifyReusableSourceQA(state, evidence, reusedName);
  }
}

function validateOriginalAuthorization(state, run) {
  if (state.authorization) {
    if (
      run.event !== "workflow_dispatch" ||
      !["normal-retry", "hotfix"].includes(state.authorization.mode) ||
      state.authorization.owner !== required("RELEASE_OWNER_LOGIN") ||
      state.authorization.runId !== String(run.id) ||
      state.authorization.sha !== state.sha ||
      !/^[1-9]\d*$/.test(state.authorization.pullRequest || "") ||
      run.actor?.login !== state.authorization.owner ||
      run.triggering_actor?.login !== state.authorization.owner
    )
      fail("Original manual release authorization is invalid");
  } else if (run.event !== "push" || run.head_sha !== state.sha) {
    fail("Original automatic release authorization is invalid");
  }
}

async function downloadAcceptedState(artifact, repository) {
  const digest = String(artifact.digest || "").match(DIGEST_PATTERN)?.[1];
  const expectedUrl = `https://api.github.com/repos/${repository}/actions/artifacts/${artifact.id}/zip`;
  if (!digest || artifact.archive_download_url !== expectedUrl)
    fail("Accepted artifact has no trusted archive digest or URL");
  const response = await fetch(expectedUrl, {
    signal: AbortSignal.timeout(30_000),
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${required("GH_TOKEN")}`,
    },
  });
  if (!response.ok)
    fail(`GitHub artifact download returned HTTP ${response.status}`);
  const archive = Buffer.from(await response.arrayBuffer());
  if (createHash("sha256").update(archive).digest("hex") !== digest)
    fail("Accepted artifact archive digest does not match GitHub metadata");
  const directory = await fs.mkdtemp(path.join(tmpdir(), "release-recovery-"));
  const archivePath = path.join(directory, "accepted.zip");
  try {
    await fs.writeFile(archivePath, archive);
    const entries = (await command("unzip", ["-Z1", archivePath]))
      .split("\n")
      .filter(Boolean);
    if (entries.length !== 1 || entries[0] !== "release-state.json")
      fail("Accepted artifact archive has unexpected contents");
    await command("unzip", ["-q", archivePath, "-d", directory]);
    return json(
      await fs.readFile(path.join(directory, "release-state.json"), "utf8"),
      "accepted release artifact",
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

export async function recoverVerify() {
  const { owner, runId } = releaseOwnerContext();
  const runAttempt = required("GITHUB_RUN_ATTEMPT");
  const originalRunId = positiveInteger(
    required("ORIGINAL_RELEASE_RUN_ID"),
    "Original release run ID",
  );
  if (originalRunId === runId)
    fail("Recovery must name an earlier release run");
  const repository = required("GITHUB_REPOSITORY");
  const [currentRun, originalRun, originalJobs, artifacts] = await Promise.all([
    workflowRun(runId),
    workflowRun(originalRunId),
    workflowJobs(originalRunId),
    github(`actions/runs/${originalRunId}/artifacts?per_page=100`),
  ]);
  validateWorkflowRun(currentRun, {
    id: runId,
    path: PRODUCTION_WORKFLOW,
    repository,
    event: "workflow_dispatch",
    sha: required("GITHUB_SHA"),
    attempt: runAttempt,
  });
  if (
    currentRun.head_branch !== "main" ||
    currentRun.actor?.login !== owner ||
    currentRun.triggering_actor?.login !== owner ||
    (await command("git", ["rev-parse", "HEAD"])) !== required("GITHUB_SHA")
  )
    fail("Recovery is not running from owner-dispatched trusted main");
  validateWorkflowRun(originalRun, {
    id: originalRunId,
    path: PRODUCTION_WORKFLOW,
    repository,
  });
  if (
    originalJobs.some(
      (job) =>
        [...Object.values(ACCEPTANCE_JOBS), "finalize-release"].includes(
          job.name,
        ) &&
        (!job.run_attempt ||
          String(job.run_attempt) === String(originalRun.run_attempt)) &&
        job.status === "completed" &&
        job.conclusion === "success",
    )
  )
    fail("Original release already passed production QA or finalized");
  if (
    !Array.isArray(artifacts.artifacts) ||
    artifacts.total_count > artifacts.artifacts.length
  )
    fail("Original release artifact inventory is incomplete");
  const matches = artifacts.artifacts.filter(
    (item) => item.name === "production-release-accepted-state",
  );
  if (matches.length !== 1)
    fail("Original release has no unique accepted state artifact");
  const artifact = matches[0];
  const expiresAt = Date.parse(artifact.expires_at || "");
  if (
    artifact.expired ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now() ||
    String(artifact.workflow_run?.id) !== originalRunId ||
    artifact.workflow_run?.repository_id !== originalRun.repository?.id ||
    artifact.workflow_run?.head_repository_id !==
      originalRun.head_repository?.id ||
    artifact.workflow_run?.head_sha !== originalRun.head_sha
  )
    fail("Original accepted artifact is expired or has invalid provenance");
  const state = await downloadAcceptedState(artifact, repository);
  if (state.stateVersion !== RELEASE_STATE_VERSION)
    fail("Legacy release artifacts require a fresh authorized release run");
  validateConfiguredPlatform(state);
  if (
    state.releaseRunId !== originalRunId ||
    state.releaseRunAttempt !== String(originalRun.run_attempt)
  )
    fail("Accepted state does not belong to the original run and attempt");
  validateOriginalAuthorization(state, originalRun);
  const [candidate, baseline, production] = await Promise.all([
    deployment(state.candidateId),
    deployment(state.baseline.deploymentId),
    currentAlias(),
  ]);
  if (
    candidate.id !== state.candidateId ||
    candidate.projectId !== state.projectId ||
    candidate.readyState !== "READY" ||
    candidate.target !== "production" ||
    deploymentSourceSha(candidate, "Recovery candidate") !== state.sha ||
    baseline.id !== state.baseline.deploymentId ||
    baseline.projectId !== state.projectId ||
    baseline.readyState !== "READY" ||
    baseline.target !== "production" ||
    deploymentSourceSha(baseline, "Recovery baseline") !== state.baseline.sha ||
    production.deploymentId !== state.candidateId ||
    production.sha !== state.sha
  )
    fail(
      "Recovery deployment, project, source, baseline, or live alias changed",
    );
  state.recovery = {
    verified: true,
    owner,
    runId,
    runAttempt,
    originalRunId,
  };
  await writeState(required("RELEASE_RECOVERY_STATE_FILE"), state);
  await appendOutputs({
    sha: state.sha,
    candidate_id: state.candidateId,
    baseline: state.baseline.deploymentId,
    baseline_sha: state.baseline.sha,
  });
}
