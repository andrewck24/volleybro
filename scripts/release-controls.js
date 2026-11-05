#!/usr/bin/env node
// Release runs this from a bare temp directory, so every controller module imports only node: builtins and siblings.
import { createHash } from "node:crypto";
import fs, { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  authorize,
  authorizeHotfix,
  authorizeRetry,
  validateOpenVersionPr,
} from "./release-controls/authorize.js";
import {
  ACCEPTANCE_JOBS,
  PRODUCTION_WORKFLOW,
  RECOVERY_COMPATIBILITY_TEST,
  RECOVERY_RECEIPT_TTL_MS,
  RELEASE_STATE_VERSION,
  REVIEW_ENVIRONMENT,
  SMOKE_JOBS,
  SOURCE_QA_SCOPES,
  appendOutputs,
  assertAncestor,
  assertExistingTagSha,
  assertSourceQAReceipt,
  assertTagSha,
  command,
  currentAlias,
  deployment,
  deploymentSourceSha,
  exactSha,
  execFile,
  fail,
  forwardOnlyNotice,
  github,
  isAncestor,
  json,
  loadState,
  moveProduction,
  nativeApprovalHistory,
  nativeCompatibilityJob,
  pendingChangesetsAt,
  positiveInteger,
  protectedJobKey,
  recoveryCompatibilityPlan,
  recoveryReceiptFacts,
  releaseOwnerContext,
  remoteTagTarget,
  required,
  shaAt,
  successfulJob,
  uniqueCompletedJob,
  validateConfiguredPlatform,
  validateWorkflowRun,
  verifyHotfixMetadata,
  verifyRecoveryEvidence,
  verifyReusableSourceQA,
  workflowJobs,
  workflowRun,
  writeState,
} from "./release-controls/core.js";
import {
  classifySmoke,
  promote,
  recordProductionQA,
  recordSmokeAcceptance,
  summarizeSmoke,
} from "./release-controls/promote.js";
import {
  checkPathClassification,
  planRecoveryCompatibility,
  recordSourceQA,
  stage,
} from "./release-controls/stage.js";

const DIGEST_PATTERN = /^sha256:([0-9a-f]{64})$/;
const CANDIDATE_LEGACY_ASSERTION = "candidate reads legacy persisted records";
const BASELINE_CANDIDATE_ASSERTION = (baselineSha) =>
  `production baseline ${baselineSha} reads candidate-written records`;

async function githubAll(path) {
  const repository = required("GITHUB_REPOSITORY");
  const pages = JSON.parse(
    await command("gh", [
      "api",
      `repos/${repository}/${path}`,
      "--paginate",
      "--slurp",
    ]),
  );
  return Array.isArray(pages[0]) ? pages.flat() : pages;
}

function sameReview(left, right) {
  return (
    left.state === right.state &&
    left.user?.login === right.user?.login &&
    left.user?.id === right.user?.id &&
    JSON.stringify(left.environments) === JSON.stringify(right.environments)
  );
}

async function verifyProtectedJobReceipt(receipt, expectedRunId, name) {
  const expectedGithubJob = protectedJobKey(name);
  if (
    !receipt ||
    receipt.runId !== String(expectedRunId) ||
    receipt.jobName !== name ||
    receipt.environment !== REVIEW_ENVIRONMENT ||
    receipt.githubJob !== expectedGithubJob ||
    !Array.isArray(receipt.reviewHistory) ||
    !receipt.reviewHistory.length
  )
    fail(`${name} receipt is not bound to the expected release run`);
  const repository = required("GITHUB_REPOSITORY");
  const [run, jobs, history] = await Promise.all([
    workflowRun(receipt.runId),
    workflowJobs(receipt.runId),
    nativeApprovalHistory(receipt.runId, receipt.environment),
  ]);
  validateWorkflowRun(run, {
    id: receipt.runId,
    path: PRODUCTION_WORKFLOW,
    repository,
    attempt: receipt.runAttempt,
  });
  const job = successfulJob(jobs, name, receipt.runAttempt);
  if (String(job.id) !== receipt.jobId)
    fail(`${name} native job identity changed`);
  if (
    receipt.reviewHistory.some(
      (recorded) => !history.some((actual) => sameReview(recorded, actual)),
    )
  )
    fail(`${name} approval history no longer contains the recorded review`);
}

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

function assertSameFiles(actual, expected, label) {
  if (
    actual.size !== expected.size ||
    [...expected].some(([path, contents]) => actual.get(path) !== contents)
  ) {
    fail(`${label} changed during merge-back`);
  }
}

async function rollbackIfCompatible() {
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

async function recordRecoveryEvidence() {
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

function assertProductionQAReceipt(state) {
  const receipt = state.productionQA;
  const binding = `${state.candidateId}:${state.sha}:${state.productionAlias}`;
  if (
    !receipt ||
    receipt.binding !== binding ||
    receipt.runId !== state.releaseRunId ||
    receipt.runAttempt !== state.releaseRunAttempt
  )
    fail("No production QA receipt is bound to the promoted candidate");
}

async function verifySmokeReceipt(state) {
  const { approval } = state.productionQA;
  const [run, jobs] = await Promise.all([
    workflowRun(state.releaseRunId),
    workflowJobs(state.releaseRunId),
  ]);
  validateWorkflowRun(run, {
    id: state.releaseRunId,
    path: PRODUCTION_WORKFLOW,
    repository: required("GITHUB_REPOSITORY"),
    attempt: state.releaseRunAttempt,
  });
  const names = SMOKE_JOBS;
  if (
    !Array.isArray(approval.jobs) ||
    approval.jobs.length !== names.length ||
    names.some((name, index) => {
      const recorded = approval.jobs[index];
      const job = successfulJob(jobs, name, state.releaseRunAttempt);
      return recorded?.name !== name || recorded.id !== String(job.id);
    }) ||
    [approval.before, approval.after].some(
      (alias) =>
        alias?.deploymentId !== state.candidateId || alias.sha !== state.sha,
    )
  )
    fail("Smoke receipt does not match this release run or candidate");
}

async function assertSingleAcceptance(state, kind) {
  const jobs = await workflowJobs(state.releaseRunId);
  const conclusion = (name) =>
    uniqueCompletedJob(jobs, name, state.releaseRunAttempt)?.conclusion;
  const other = kind === "human" ? "smoke" : "human";
  if (
    conclusion(ACCEPTANCE_JOBS[kind]) !== "success" ||
    conclusion(ACCEPTANCE_JOBS[other]) !== "skipped"
  )
    fail(
      `Exactly one of ${ACCEPTANCE_JOBS.human} or ${ACCEPTANCE_JOBS.smoke} must succeed and the other be skipped`,
    );
}

async function finalize() {
  const state = await loadState();
  validateConfiguredPlatform(state);
  assertProductionQAReceipt(state);
  const { facts } = await verifyRecoveryEvidence(state, state.releaseRunId, {
    ignoreExpiry: true,
  });
  const kind = state.productionQA.approval?.kind;
  if (!Object.hasOwn(ACCEPTANCE_JOBS, kind))
    fail("Production QA receipt has no known approval kind");
  await assertSingleAcceptance(state, kind);
  if (kind === "human")
    await verifyProtectedJobReceipt(
      state.productionQA.approval,
      state.releaseRunId,
      ACCEPTANCE_JOBS.human,
    );
  else await verifySmokeReceipt(state);
  const production = await currentAlias();
  if (
    production.deploymentId !== state.candidateId ||
    production.sha !== state.sha
  )
    fail(
      "Cannot create release evidence before candidate is confirmed on production",
    );
  const version = json(
    await shaAt(state.sha, "package.json"),
    "package.json",
  ).version;
  const tag = `v${version}`;
  const local = await command("git", [
    "rev-parse",
    "--verify",
    `${tag}^{}`,
  ]).catch(() => "");
  assertTagSha(local, state.sha, tag);
  const lookupRemoteTag = () =>
    command("git", [
      "ls-remote",
      "origin",
      `refs/tags/${tag}`,
      `refs/tags/${tag}^{}`,
    ]);
  let remote = await lookupRemoteTag();
  if (!remote) {
    if (!local) await command("git", ["tag", tag, state.sha]);
    // A lost race still succeeds when the re-lookup finds the tag.
    let pushError;
    await command("git", ["push", "origin", `refs/tags/${tag}`]).catch(
      (error) => {
        pushError = error;
      },
    );
    remote = await lookupRemoteTag();
    if (!remote && pushError) throw pushError;
  }
  assertExistingTagSha(remoteTagTarget(remote, tag), state.sha, tag);
  const existing = await command("gh", [
    "release",
    "view",
    tag,
    "--json",
    "tagName",
  ]).catch(() => "");
  if (!existing) {
    const notes = changelogEntry(
      await shaAt(state.sha, "CHANGELOG.md"),
      version,
    );
    // Keep the fallback: a version released without changesets has no entry.
    const forwardOnly = forwardOnlyNotice(facts).trim();
    const text = [notes, forwardOnly].filter(Boolean).join("\n\n");
    await command("gh", [
      "release",
      "create",
      tag,
      "--target",
      state.sha,
      "--title",
      tag,
      ...(text ? ["--notes", text] : []),
      ...(notes ? [] : ["--generate-notes"]),
    ]);
  }
}

// Standalone twin of release-pr-body.js's parser: this controller runs without node_modules.
function changelogEntry(changelog, version) {
  const lines = changelog.split("\n");
  const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
  if (start === -1) return "";
  const end = lines.findIndex(
    (line, index) => index > start && line.startsWith("## "),
  );
  return lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join("\n")
    .trim();
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

async function recoverVerify() {
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

function packageWithVersion(contents, current, next) {
  if (current === next) return contents;
  const pattern = /("version"\s*:\s*)"[^"]+"/g;
  if ([...contents.matchAll(pattern)].length !== 1)
    fail("Could not safely locate the package version");
  const updated = contents.replace(pattern, `$1"${next}"`);
  const replacements = updated === contents ? 0 : 1;
  if (replacements !== 1 || json(updated, "package.json").version !== next)
    fail("Could not safely reconcile the package version");
  return updated;
}

async function mergeText(current, base, incoming, label) {
  const directory = await fs.mkdtemp(path.join(tmpdir(), "release-merge-"));
  const currentPath = path.join(directory, "current");
  const basePath = path.join(directory, "base");
  const incomingPath = path.join(directory, "incoming");
  try {
    await Promise.all([
      fs.writeFile(currentPath, current),
      fs.writeFile(basePath, base),
      fs.writeFile(incomingPath, incoming),
    ]);
    const result = await execFile(
      "git",
      ["merge-file", "-p", currentPath, basePath, incomingPath],
      { maxBuffer: 8 * 1024 * 1024 },
    );
    return result.stdout;
  } catch (error) {
    if (error.code === 1) fail(`${label} has unsupported conflicting changes`);
    fail(`git merge-file failed: ${error.stderr?.trim() || error.message}`);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

async function appendSummary(message) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${message}\n`);
}

async function existingMergeBack(repository, branch) {
  const owner = repository.split("/")[0];
  const pulls = await githubAll(
    `pulls?state=all&base=main&head=${encodeURIComponent(`${owner}:${branch}`)}&per_page=100`,
  );
  if (pulls.length > 1) fail("Multiple merge-back pull requests exist");
  const pr = pulls[0];
  if (!pr) return null;
  if (
    pr.base?.ref !== "main" ||
    pr.base?.repo?.full_name !== repository ||
    pr.head?.ref !== branch ||
    pr.head?.repo?.full_name !== repository
  ) {
    fail("Existing merge-back pull request has unexpected repository metadata");
  }
  if (pr.state === "closed" && !pr.merged_at)
    fail("Existing merge-back pull request was closed without merging");
  return pr;
}

async function mergeBackMetadata(main, baseline, repair) {
  const metadata = await verifyHotfixMetadata(baseline, repair);
  const mainPackageText = await shaAt(main, "package.json");
  const mainPackage = json(mainPackageText, "package.json");
  if (
    mainPackage.version !== metadata.basePackage.version &&
    mainPackage.version !== metadata.repairPackage.version
  ) {
    fail("Main package version is neither the deployed nor hotfix version");
  }
  const mainChangelog = await shaAt(main, "CHANGELOG.md");
  if (
    mainChangelog !== metadata.baseChangelog &&
    mainChangelog !== metadata.repairChangelog
  ) {
    fail("Main changelog cannot be reconciled safely with the hotfix");
  }
  const packageJson = await mergeText(
    packageWithVersion(
      mainPackageText,
      mainPackage.version,
      metadata.repairPackage.version,
    ),
    packageWithVersion(
      metadata.basePackageText,
      metadata.basePackage.version,
      metadata.repairPackage.version,
    ),
    metadata.repairPackageText,
    "package.json",
  );
  if (
    json(packageJson, "reconciled package.json").version !==
    metadata.repairPackage.version
  ) {
    fail("Reconciled package version does not match the deployed hotfix");
  }
  return {
    packageJson,
    version: metadata.repairPackage.version,
    changelog:
      mainChangelog === metadata.baseChangelog
        ? metadata.repairChangelog
        : mainChangelog,
  };
}

async function prepareMergeBack() {
  const state = await loadState();
  const repair = exactSha(state.sha, "Hotfix state SHA");
  const baseline = exactSha(state.baseline?.sha, "Hotfix baseline SHA");
  const repository = required("GITHUB_REPOSITORY");
  const branch = `hotfix-merge-back/${repair}`;
  const existing = await existingMergeBack(repository, branch);
  if (existing) {
    const result = existing.merged_at
      ? `Hotfix merge-back already merged: ${existing.html_url}`
      : `Hotfix merge-back already open: ${existing.html_url}`;
    await appendSummary(`### Hotfix merge-back\n\n${result}`);
    process.stdout.write(`${result}\n`);
    return;
  }

  if (await command("git", ["status", "--porcelain"]))
    fail("Merge-back requires a clean checkout");
  await command("git", ["fetch", "origin", "main"]);
  const main = exactSha(
    await command("git", ["rev-parse", "refs/remotes/origin/main"]),
    "Remote main SHA",
  );
  await assertAncestor(
    baseline,
    repair,
    "Hotfix state does not descend from its deployed baseline",
  );
  try {
    await command("git", ["cat-file", "-e", `${repair}^{commit}`]);
  } catch {
    fail("Hotfix commit is unavailable in the merge-back checkout");
  }
  if (await isAncestor(repair, main)) {
    const message = `Hotfix ${repair} is already contained in main`;
    await appendSummary(`### Hotfix merge-back\n\n${message}.`);
    process.stdout.write(`${message}\n`);
    return;
  }

  const pending = await pendingChangesetsAt(main);
  const metadata = await mergeBackMetadata(main, baseline, repair);
  const originalBranch = await command("git", [
    "symbolic-ref",
    "--quiet",
    "--short",
    "HEAD",
  ]).catch(() => "");
  const originalCommit = await command("git", ["rev-parse", "HEAD"]);
  try {
    await command("git", ["checkout", "-B", branch, main]);
    let mergeError;
    try {
      await command("git", ["merge", "--no-ff", "--no-commit", repair]);
    } catch (error) {
      mergeError = error;
    }
    const unmerged = (
      await command("git", ["diff", "--name-only", "--diff-filter=U"])
    )
      .split("\n")
      .filter(Boolean);
    const unsupported = unmerged.filter(
      (path) => !["package.json", "CHANGELOG.md"].includes(path),
    );
    if (unsupported.length)
      fail(`Hotfix merge has unsupported conflicts: ${unsupported.join(", ")}`);
    if (mergeError && !unmerged.length) throw mergeError;
    if (unmerged.includes("package.json")) {
      await fs.writeFile("package.json", metadata.packageJson);
      await command("git", ["add", "package.json"]);
    } else if (
      json(await fs.readFile("package.json", "utf8"), "merged package.json")
        .version !== metadata.version
    ) {
      fail("Merged package version does not match the deployed hotfix");
    }
    if (unmerged.includes("CHANGELOG.md")) {
      await fs.writeFile("CHANGELOG.md", metadata.changelog);
      await command("git", ["add", "CHANGELOG.md"]);
    } else if (
      (await fs.readFile("CHANGELOG.md", "utf8")) !== metadata.changelog
    ) {
      fail("Merged changelog does not match the deployed hotfix");
    }
    const remaining = await command("git", [
      "diff",
      "--name-only",
      "--diff-filter=U",
    ]);
    if (remaining) fail(`Hotfix merge still has conflicts: ${remaining}`);
    await command("git", [
      "commit",
      "-m",
      "chore(release): merge deployed hotfix back",
      "-m",
      "Preserve the deployed repair history while reconciling release metadata.",
    ]);
    const merge = exactSha(
      await command("git", ["rev-parse", "HEAD"]),
      "Merge SHA",
    );
    if ((await command("git", ["rev-parse", "HEAD^2"])) !== repair)
      fail("Merge-back did not retain the hotfix commit as a parent");
    assertSameFiles(
      await pendingChangesetsAt(merge),
      pending,
      "Pending changesets",
    );
    await command("git", ["push", "origin", `HEAD:refs/heads/${branch}`]);
    const body = [
      `Merge the deployed hotfix commit \`${repair}\` into main without rebasing.`,
      "",
      "The generated merge commit preserves current main work and pending changesets. This pull request is never auto-merged; an explicitly authorized agent handles review, conflict resolution and merge first.",
      "",
      `Deployed baseline: \`${baseline}\`. Prepared against main: \`${main}\`. Follow WORKFLOW.md's hotfix synchronization procedure; recheck the deployed tag and latest main, preserve both histories and pending changesets, and do not rerun publication to resolve synchronization. Merge requires explicit authorization and latest required checks.`,
      "",
      "## 中文摘要",
      "",
      "優先交由 Agent 檢視、處理衝突與同步；保留 main 工作與 pending changesets，依 WORKFLOW.md 的 hotfix 同步流程驗證。取得明確合併授權且最新 checks 通過後，以 merge commit 合併；需要新決策或無法安全解決才交回開發者，不自動派工或 auto-merge。",
    ].join("\n");
    const url = await command("gh", [
      "pr",
      "create",
      "--repo",
      repository,
      "--base",
      "main",
      "--head",
      branch,
      "--title",
      "chore(release): merge deployed hotfix back",
      "--body",
      body,
    ]);
    await appendSummary(
      `### Hotfix merge-back\n\nOpened ${url} for deployed SHA \`${repair}\`. Start an agent with this PR and the accepted release state; follow WORKFLOW.md's hotfix synchronization procedure. No unattended dispatch or auto-merge; merging requires explicit authorization and latest required checks.`,
    );
    process.stdout.write(`${JSON.stringify({ branch, merge, url })}\n`);
  } catch (error) {
    await command("git", ["merge", "--abort"]).catch(() => undefined);
    await command(
      "git",
      originalBranch
        ? ["checkout", originalBranch]
        : ["checkout", "--detach", originalCommit],
    ).catch(() => undefined);
    throw error;
  }
}

const actions = {
  authorize,
  "authorize-retry": authorizeRetry,
  "authorize-hotfix": authorizeHotfix,
  "validate-version-pr": validateOpenVersionPr,
  stage,
  "record-source-qa": recordSourceQA,
  "plan-recovery-compatibility": planRecoveryCompatibility,
  "check-path-classification": checkPathClassification,
  promote,
  "summarize-smoke": summarizeSmoke,
  "classify-smoke": classifySmoke,
  "record-smoke-acceptance": recordSmokeAcceptance,
  "rollback-if-compatible": rollbackIfCompatible,
  "record-recovery-evidence": recordRecoveryEvidence,
  "record-production-qa": recordProductionQA,
  "recover-verify": recoverVerify,
  finalize,
  "merge-back": prepareMergeBack,
};
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const action = actions[process.argv[2]];
    if (!action)
      fail(
        `Usage: node scripts/release-controls.js ${Object.keys(actions).join("|")}`,
      );
    await action();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
