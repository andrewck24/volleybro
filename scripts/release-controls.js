#!/usr/bin/env node
// Release runs this from a bare temp directory, so every controller module imports only node: builtins and siblings.
import { createHash } from "node:crypto";
import fs, { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  ACCEPTANCE_JOBS,
  AUTH_CONTRACT_PATTERNS,
  CI_WORKFLOW,
  PRODUCTION_WORKFLOW,
  RECOVERY_COMPATIBILITY_TEST,
  RECOVERY_RECEIPT_TTL_MS,
  RELEASE_STATE_VERSION,
  REVIEW_ENVIRONMENT,
  SMOKE_JOBS,
  SOURCE_QA_SCOPES,
  appendOutputs,
  assertAncestor,
  assertBaseline,
  assertExistingTagSha,
  assertSourceQAReceipt,
  assertTagSha,
  changedSourcePaths,
  command,
  currentAlias,
  deployment,
  deploymentSourceSha,
  exactSha,
  execFile,
  fail,
  forwardOnlyNotice,
  github,
  hostname,
  isAncestor,
  jobEvidence,
  json,
  loadState,
  moveProduction,
  nativeApprovalHistory,
  nativeCompatibilityJob,
  pendingChangesetsAt,
  persistedContractChanges,
  positiveInteger,
  protectedJobKey,
  recoveryCompatibilityPlan,
  recoveryReceiptFacts,
  releaseOwnerContext,
  remoteTagTarget,
  required,
  shaAt,
  sourceScopeEvidence,
  stagingDomains,
  successfulJob,
  uniqueCompletedJob,
  validateCandidate,
  validateConfiguredPlatform,
  validateReleaseAuthorization,
  validateWorkflowRun,
  vercel,
  verifyHotfixMetadata,
  verifyRecoveryEvidence,
  verifyReusableSourceQA,
  workflowJobs,
  workflowRun,
  writeState,
} from "./release-controls/core.js";

const DIGEST_PATTERN = /^sha256:([0-9a-f]{64})$/;
const PUSH_LOOKUP_ATTEMPTS = 12;
const PUSH_LOOKUP_DELAY_MS = 5_000;
const AUTH_ENV_PATTERN = /^(?:BETTER_AUTH|AUTH_GOOGLE)_/;
const SMOKE_SESSION = "@smoke session is valid";
const SMOKE_TEAM = "@smoke test team read-only page";
const SMOKE_EXPECTED = [
  ["oauth", "@smoke oauth configuration"],
  ...["chromium", "webkit"].flatMap((project) =>
    [SMOKE_SESSION, SMOKE_TEAM].map((title) => [project, title]),
  ),
];
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

async function protectedJobReceipt(name, environment) {
  const repository = required("GITHUB_REPOSITORY");
  const runId = required("GITHUB_RUN_ID");
  const runAttempt = required("GITHUB_RUN_ATTEMPT");
  const [run, jobs, reviews] = await Promise.all([
    workflowRun(runId),
    workflowJobs(runId),
    nativeApprovalHistory(runId, environment),
  ]);
  validateWorkflowRun(run, {
    id: runId,
    path: PRODUCTION_WORKFLOW,
    repository,
    attempt: runAttempt,
  });
  const matches = jobs.filter(
    (job) =>
      job.name === name &&
      (!job.run_attempt || String(job.run_attempt) === runAttempt),
  );
  if (
    matches.length !== 1 ||
    !(
      matches[0].status === "in_progress" ||
      (matches[0].status === "completed" && matches[0].conclusion === "success")
    )
  )
    fail(`${name} is not the current protected workflow job`);
  const expectedGithubJob = protectedJobKey(name);
  if (required("GITHUB_JOB") !== expectedGithubJob)
    fail(`${name} is running from an unexpected workflow job`);
  return {
    runId,
    runAttempt,
    githubJob: expectedGithubJob,
    jobId: positiveInteger(matches[0].id, `${name} job ID`),
    jobName: name,
    environment,
    reviewHistory: reviews,
  };
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

export function validateRequiredChecks(sha, checkRuns, statuses, repository) {
  const latestVerify = checkRuns
    .filter((run) => run.name === "Verify")
    .sort(
      (a, b) =>
        Date.parse(b.started_at || b.created_at || "") -
        Date.parse(a.started_at || a.created_at || ""),
    )[0];
  if (
    !latestVerify ||
    latestVerify.head_sha !== sha ||
    Number(latestVerify.app?.id) !== 15368 ||
    latestVerify.status !== "completed" ||
    latestVerify.conclusion !== "success"
  ) {
    fail(
      "Latest Verify check on the PR head is not a successful run from GitHub Actions",
    );
  }
  const latestVercel = statuses
    .filter((status) => status.context === "Vercel")
    .sort(
      (a, b) =>
        Date.parse(b.updated_at || b.created_at || "") -
        Date.parse(a.updated_at || a.created_at || ""),
    )[0];
  if (
    !latestVercel ||
    latestVercel.url !==
      `https://api.github.com/repos/${repository}/statuses/${sha}` ||
    latestVercel.creator?.id !== 35613825 ||
    latestVercel.creator?.login !== "vercel[bot]" ||
    latestVercel.creator?.type !== "Bot" ||
    latestVercel.state !== "success"
  ) {
    fail("Latest Vercel commit status on the PR head is not successful");
  }
}

function validateAuthorization({
  sha,
  pr,
  expectedAuthor,
  repository,
  checkRuns,
  statuses,
}) {
  validateVersionPr(pr, expectedAuthor, repository);
  if (pr.state !== "closed" || !pr.merged || pr.merge_commit_sha !== sha)
    fail("Version PR must be merged at this exact commit");
  validateRequiredChecks(pr.head.sha, checkRuns, statuses, repository);
}

function validateHotfixPr({ pr, sha, repository, checkRuns, statuses }) {
  if (
    pr.base.ref !== "main" ||
    pr.base.repo?.full_name !== repository ||
    !pr.head.ref?.startsWith("hotfix/") ||
    pr.head.repo?.full_name !== repository
  ) {
    fail("Hotfix PR must use a same-repository hotfix/* branch targeting main");
  }
  if (pr.head.sha !== sha || pr.merged || pr.draft || pr.state !== "open") {
    fail(
      "Hotfix PR must remain open, unmerged, and point at the exact authorized SHA",
    );
  }
  validateRequiredChecks(sha, checkRuns, statuses, repository);
}

function validateVersionPr(pr, expectedAuthor, repository) {
  if (
    !expectedAuthor ||
    pr.base.ref !== "main" ||
    pr.base.repo.full_name !== repository
  ) {
    fail("Version PR must target this repository main branch");
  }
  if (
    pr.user?.login !== expectedAuthor ||
    pr.head.ref !== "changeset-release/main" ||
    pr.head.repo?.full_name !== repository
  ) {
    fail("Version PR author and same-repository head branch are not trusted");
  }
  if (pr.title !== "release: update versions")
    fail("Version PR title does not match");
  return true;
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

function validateReviewEnvironment(environment) {
  if (
    !environment.protection_rules?.some(
      (rule) => rule.type === "required_reviewers" && rule.reviewers?.length,
    )
  ) {
    fail("Production candidate QA environment has no required reviewers");
  }
}

function assertSameFiles(actual, expected, label) {
  if (
    actual.size !== expected.size ||
    [...expected].some(([path, contents]) => actual.get(path) !== contents)
  ) {
    fail(`${label} changed during merge-back`);
  }
}

async function assertRemoteBaselineTag(sha, version) {
  const tag = `v${version}`;
  const output = await command("git", [
    "ls-remote",
    "origin",
    `refs/tags/${tag}`,
    `refs/tags/${tag}^{}`,
  ]);
  assertExistingTagSha(remoteTagTarget(output, tag), sha, tag);
}

async function verifyMetadataOnly(base, head) {
  const status = await command("git", [
    "diff",
    "--name-status",
    "--no-renames",
    `${base}...${head}`,
  ]);
  const files = status
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("\t"));
  if (files.length === 0) fail("Version PR has no changes");
  let versionFiles = 0;
  let changelogFiles = 0;
  let consumedChangesets = 0;
  for (const [change, path] of files) {
    if (
      /^(?:package\.json|packages\/[^/]+\/package\.json)$/.test(path) &&
      change === "M"
    ) {
      const before = json(await shaAt(base, path), path);
      const after = json(await shaAt(head, path), path);
      const beforeVersion = before.version;
      const afterVersion = after.version;
      if (!beforeVersion || !afterVersion || beforeVersion === afterVersion)
        fail(`Invalid version change in ${path}`);
      delete before.version;
      delete after.version;
      if (JSON.stringify(before) !== JSON.stringify(after))
        fail(`Non-version package metadata changed in ${path}`);
      versionFiles += 1;
    } else if (
      /^(?:packages\/[^/]+\/)?CHANGELOG\.md$/.test(path) &&
      change === "M"
    ) {
      changelogFiles += 1;
    } else if (
      path.startsWith(".changeset/") &&
      path.endsWith(".md") &&
      change === "D"
    ) {
      consumedChangesets += 1;
    } else {
      fail(`Release PR contains a non-metadata change: ${change} ${path}`);
    }
  }
  if (!versionFiles || !changelogFiles || !consumedChangesets) {
    fail(
      "Release PR must change package versions and changelogs and consume at least one changeset",
    );
  }
}

async function validateMergedVersionPr(pullRequest, sha) {
  const pr = await github(`pulls/${pullRequest}`);
  const [checks, statuses, environment] = await Promise.all([
    github(`commits/${pr.head.sha}/check-runs?per_page=100`),
    github(`commits/${pr.head.sha}/statuses?per_page=100`),
    github("environments/production-release-review"),
  ]);
  validateAuthorization({
    sha,
    pr,
    expectedAuthor: required("RELEASE_BOT_LOGIN"),
    repository: required("GITHUB_REPOSITORY"),
    checkRuns: checks.check_runs,
    statuses,
  });
  const parent = await command("git", ["rev-parse", `${sha}^1`]);
  await verifyMetadataOnly(parent, sha);
  validateReviewEnvironment(environment);
  return pr;
}

async function mergedPullsForPush(sha) {
  // GitHub can index a fresh merge a moment after the push event.
  for (let attempt = 1; ; attempt++) {
    const pulls = (await github(`commits/${sha}/pulls`)).filter(
      (pr) => pr.merged_at && pr.merge_commit_sha === sha,
    );
    if (pulls.length || attempt === PUSH_LOOKUP_ATTEMPTS) return pulls;
    await new Promise((resolve) => setTimeout(resolve, PUSH_LOOKUP_DELAY_MS));
  }
}

async function authorize() {
  const sha = exactSha(required("GITHUB_SHA"), "Pushed SHA");
  if (
    required("GITHUB_EVENT_NAME") !== "push" ||
    required("GITHUB_REF") !== "refs/heads/main"
  )
    fail("Automatic release only starts from a push to main");
  const pulls = await mergedPullsForPush(sha);
  if (!pulls.length)
    fail(
      "No merged pull request found for this push; the release owner dispatches normal-retry with the version PR number and merge SHA",
    );
  if (pulls.length > 1)
    fail("More than one merged pull request matches this push; stop");
  const [pr] = pulls;
  // Only a PR from another branch is certainly not the version PR; any PR from
  // the version branch must pass full validation.
  if (
    pr.head.ref !== "changeset-release/main" ||
    pr.head.repo?.full_name !== pr.base.repo?.full_name
  ) {
    await fs.appendFile(required("GITHUB_OUTPUT"), "release=false\n");
    process.stdout.write(
      `${JSON.stringify({ release: false, reason: "Push did not merge the version PR; no release needed" })}\n`,
    );
    return;
  }
  const owner = required("RELEASE_OWNER_LOGIN");
  if (
    required("GITHUB_ACTOR") !== owner ||
    required("GITHUB_TRIGGERING_ACTOR") !== owner
  )
    fail(
      "Only the release owner's merge starts a release; the release owner dispatches normal-retry for this version PR",
    );
  // A single-parent merge must land as one commit, or only its last commit
  // would be checked for metadata-only changes.
  const { before } = json(
    await fs.readFile(required("GITHUB_EVENT_PATH"), "utf8"),
    "GitHub event",
  );
  const parents = (
    await command("git", ["rev-list", "--parents", "-n", "1", sha])
  ).split(" ");
  if (parents.length === 2 && parents[1] !== before)
    fail(
      "Rebase merge of a multi-commit version PR cannot be verified; merge it with a merge commit or squash",
    );
  await validateMergedVersionPr(pr.number, sha);
  await fs.appendFile(required("GITHUB_OUTPUT"), `release=true\nsha=${sha}\n`);
  process.stdout.write(
    `${JSON.stringify({ sha, version: json(await shaAt(sha, "package.json"), "package.json").version })}\n`,
  );
}

async function authorizeRetry() {
  const { owner, runId } = releaseOwnerContext();
  const pullRequest = required("RELEASE_PR_NUMBER");
  if (!/^\d+$/.test(pullRequest))
    fail("Release PR must be a pull request number");
  const sha = exactSha(required("RELEASE_SHA"), "Release SHA");
  const controller = exactSha(required("CONTROLLER_SHA"), "Controller SHA");
  if ((await command("git", ["rev-parse", "HEAD"])) !== controller)
    fail("Retry checkout does not match the trusted controller SHA");
  await assertAncestor(
    sha,
    controller,
    "Retry controller does not contain the authorized release",
  );
  const pr = await validateMergedVersionPr(pullRequest, sha);
  const authorization = {
    owner,
    runId,
    pullRequest,
    sha,
    mode: "normal-retry",
    reviewedSourceSha: exactSha(pr.head.sha, "Version PR head SHA"),
  };
  await fs.appendFile(
    required("GITHUB_OUTPUT"),
    `sha=${sha}\nrelease_authorization=${JSON.stringify(authorization)}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({ sha, version: json(await shaAt(sha, "package.json"), "package.json").version, authorization })}\n`,
  );
}

async function authorizeHotfix() {
  const { owner, runId } = releaseOwnerContext();
  const pullRequest = required("HOTFIX_PR_NUMBER");
  if (!/^\d+$/.test(pullRequest))
    fail("HOTFIX_PR_NUMBER must be a pull request number");
  const sha = exactSha(required("RELEASE_SHA"), "Hotfix SHA");
  const pr = await github(`pulls/${pullRequest}`);
  const [checks, statuses, environment] = await Promise.all([
    github(`commits/${sha}/check-runs?per_page=100`),
    github(`commits/${sha}/statuses?per_page=100`),
    github("environments/production-release-review"),
  ]);
  validateHotfixPr({
    pr,
    sha,
    repository: required("GITHUB_REPOSITORY"),
    checkRuns: checks.check_runs,
    statuses,
  });
  validateReviewEnvironment(environment);
  const baseline = await currentAlias();
  await assertAncestor(
    baseline.sha,
    sha,
    "Hotfix SHA does not descend from the deployed production source",
  );
  const integration = exactSha(pr.base.sha, "Hotfix PR integration SHA");
  const shared = await command("git", [
    "merge-base",
    "--all",
    sha,
    integration,
  ]);
  for (const commit of shared.split("\n")) {
    await assertAncestor(
      commit,
      baseline.sha,
      "Hotfix SHA includes unreleased integration history",
    );
  }
  const metadata = await verifyHotfixMetadata(baseline.sha, sha);
  await assertRemoteBaselineTag(baseline.sha, metadata.basePackage.version);
  const authorization = { owner, runId, pullRequest, sha, mode: "hotfix" };
  if (process.env.GITHUB_OUTPUT) {
    await fs.appendFile(
      process.env.GITHUB_OUTPUT,
      `sha=${sha}\nbaseline_deployment=${baseline.deploymentId}\nbaseline_updated_at=${baseline.updatedAt}\nbaseline_sha=${baseline.sha}\nrelease_authorization=${JSON.stringify(authorization)}\n`,
    );
  }
  process.stdout.write(
    `${JSON.stringify({ sha, version: metadata.repairPackage.version, baseline, authorization })}\n`,
  );
}

async function validateOpenVersionPr() {
  const event = json(
    await fs.readFile(required("GITHUB_EVENT_PATH"), "utf8"),
    "GitHub event",
  );
  const prNumber = event.pull_request?.number;
  if (!prNumber || event.action === "closed")
    fail("Expected an open version pull request event");
  const pr = await github(`pulls/${prNumber}`);
  if (pr.state !== "open" || pr.merged)
    fail("Version PR metadata validation only accepts open PRs");
  validateVersionPr(
    pr,
    process.env.RELEASE_BOT_LOGIN,
    required("GITHUB_REPOSITORY"),
  );
  await verifyMetadataOnly(pr.base.sha, pr.head.sha);
  process.stdout.write(
    `${JSON.stringify({ valid: true, pullRequest: pr.number })}\n`,
  );
}

async function reviewedSourceMapping(sha, authorization) {
  if (authorization?.mode === "hotfix") return undefined;
  const reviewed = exactSha(
    authorization?.reviewedSourceSha ||
      (await command("git", ["rev-parse", `${sha}^2`])),
    "Reviewed version PR head SHA",
  );
  await assertAncestor(
    reviewed,
    sha,
    "Reviewed version PR head is not an ancestor of the release merge",
  );
  const [reviewedTree, releaseTree] = await Promise.all([
    command("git", ["rev-parse", `${reviewed}^{tree}`]),
    command("git", ["rev-parse", `${sha}^{tree}`]),
  ]);
  if (reviewedTree !== releaseTree)
    fail(
      "Reviewed version PR head and release merge do not have the same tree",
    );
  return { reviewedSha: reviewed, releaseSha: sha, tree: releaseTree };
}

async function stage() {
  const sha = exactSha(required("RELEASE_SHA"), "Release SHA");
  const releaseMode = required("RELEASE_MODE");
  if (!["normal", "normal-retry", "hotfix"].includes(releaseMode))
    fail("Unsupported release mode");
  const authorization = process.env.RELEASE_AUTHORIZATION
    ? json(process.env.RELEASE_AUTHORIZATION, "manual release authorization")
    : undefined;
  if (authorization || process.env.GITHUB_EVENT_NAME === "workflow_dispatch")
    validateReleaseAuthorization(authorization, sha);
  const controllerSha = exactSha(
    required("CONTROLLER_SHA"),
    "Trusted controller SHA",
  );
  if ((await command("git", ["rev-parse", "HEAD"])) !== sha)
    fail("Checkout is not the exact authorized release SHA");
  const domains = await stagingDomains();
  const baseline = await currentAlias();
  if (process.env.EXPECTED_BASELINE_SHA) {
    assertBaseline(baseline, {
      deploymentId: required("EXPECTED_BASELINE_DEPLOYMENT"),
      updatedAt: required("EXPECTED_BASELINE_UPDATED_AT"),
      sha: exactSha(
        required("EXPECTED_BASELINE_SHA"),
        "Authorized baseline SHA",
      ),
    });
  }
  await assertAncestor(
    baseline.sha,
    sha,
    "Authorized release SHA does not contain the deployed production source",
  );
  const result = json(
    await command(
      "pnpm",
      [
        "dlx",
        "vercel@61.1.0",
        "deploy",
        "--prod",
        "--skip-domain",
        "--yes",
        "--json",
        "--token",
        required("VERCEL_TOKEN"),
        "--meta",
        `releaseSha=${sha}`,
        "--meta",
        `releaseBaseline=${baseline.deploymentId}`,
      ],
      {
        env: {
          ...process.env,
          VERCEL_PROJECT_ID: required("VERCEL_PROJECT_ID"),
          VERCEL_ORG_ID: required("VERCEL_ORG_ID"),
        },
      },
    ),
    "Vercel deploy output",
  );
  const candidateId = result.id || result.deployment?.id;
  const candidateUrl = result.url || result.deployment?.url;
  if (!candidateId || !candidateUrl)
    fail("Vercel deploy output did not include candidate identity");
  const candidate = await deployment(candidateId);
  if (!candidate.id) fail("Staged deployment did not return an ID");
  validateCandidate(candidate, candidateId, sha, domains);
  assertBaseline(await currentAlias(), baseline);
  const reviewedSource = await reviewedSourceMapping(sha, authorization);
  const output = {
    stateVersion: RELEASE_STATE_VERSION,
    candidateId: candidate.id,
    sha,
    controllerSha,
    projectId: required("VERCEL_PROJECT_ID"),
    productionAlias: hostname(required("PRODUCTION_ALIAS"), "Production alias"),
    releaseRunId: positiveInteger(required("GITHUB_RUN_ID"), "Release run ID"),
    releaseRunAttempt: positiveInteger(
      process.env.GITHUB_RUN_ATTEMPT || "1",
      "Release run attempt",
    ),
    releaseMode,
    baseline,
    ...(reviewedSource && { reviewedSource }),
    ...(authorization && { authorization }),
  };
  const outputPath = required("GITHUB_OUTPUT");
  await fs.appendFile(
    outputPath,
    `candidate_id=${output.candidateId}\nbaseline=${baseline.deploymentId}\nsha=${sha}\n`,
  );
  await fs.writeFile(
    required("RELEASE_STATE_FILE"),
    `${JSON.stringify(output, null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify(output)}\n`);
}

async function reusableSourceQA(state) {
  const scopes = { unit: null, integration: null };
  const rejections = {};
  const repository = required("GITHUB_REPOSITORY");
  let workflow, responses;
  try {
    [workflow, ...responses] = await Promise.all([
      github("actions/workflows/ci.yml"),
      ...[
        ...new Set(
          [
            state.sha,
            state.reviewedSource?.reviewedSha,
            state.controllerSha,
          ].filter(Boolean),
        ),
      ].map((sha) =>
        github(`actions/workflows/ci.yml/runs?head_sha=${sha}&per_page=100`),
      ),
    ]);
  } catch {
    return { scopes, rejections };
  }
  if (workflow.path !== CI_WORKFLOW || !Number.isInteger(workflow.id))
    return { scopes, rejections };
  if (
    responses.some(
      (response) =>
        !Array.isArray(response.workflow_runs) ||
        response.total_count > response.workflow_runs.length,
    )
  )
    fail("CI workflow run inventory is incomplete");
  const runs = [
    ...new Map(
      responses
        .flatMap((response) => response.workflow_runs)
        .map((run) => [run.id, run]),
    ).values(),
  ];
  for (const run of runs) {
    try {
      validateWorkflowRun(run, {
        path: CI_WORKFLOW,
        repository,
      });
      if (
        run.status !== "completed" ||
        run.workflow_id !== workflow.id ||
        !run.run_attempt
      )
        continue;
      const jobs = await workflowJobs(run.id);
      for (const [scope, name] of SOURCE_QA_SCOPES) {
        if (scopes[scope]) continue;
        try {
          scopes[scope] = await sourceScopeEvidence(
            state,
            run,
            jobs,
            workflow,
            scope,
            name,
          );
        } catch (error) {
          rejections[scope] = error.message;
        }
      }
      if (scopes.unit && scopes.integration) break;
    } catch {
      continue;
    }
  }
  return { scopes, rejections };
}

async function recordSourceQA() {
  const state = await loadState();
  validateConfiguredPlatform(state);
  const { scopes, rejections } = await reusableSourceQA(state);
  if (!scopes.unit || !scopes.integration) {
    const reasons = Object.entries(rejections)
      .filter(([scope]) => !scopes[scope])
      .map(([scope, reason]) => `${scope}: ${reason}`);
    fail(
      `Missing trusted CI evidence for this source tree; complete CI before retrying release${reasons.length ? ` (${reasons.join("; ")})` : ""}`,
    );
  }
  state.sourceQA = {
    sourceSha: state.sha,
    boundRunId: state.releaseRunId,
    boundRunAttempt: state.releaseRunAttempt,
    scopes,
  };
  assertSourceQAReceipt(state);
  await writeState(required("RELEASE_STATE_FILE"), state);
}

async function promote() {
  const state = await loadState();
  validateConfiguredPlatform(state);
  if (state.sha !== required("RELEASE_SHA")) fail("Release state SHA mismatch");
  await verifyRecoveryEvidence(state);
  assertBaseline(await currentAlias(), state.baseline);
  const candidate = await deployment(state.candidateId);
  validateCandidate(
    candidate,
    state.candidateId,
    state.sha,
    await stagingDomains(),
  );
  const confirmed = await moveProduction(
    `/v10/projects/${required("VERCEL_PROJECT_ID")}/promote/${state.candidateId}`,
    { deploymentId: state.candidateId, sha: state.sha },
    state.baseline,
  );
  await appendOutputs({
    production_deployment_id: confirmed.deploymentId,
    production_sha: confirmed.sha,
  });
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

// Run on pull requests, so a path the release classifier cannot place fails the
// PR that adds it instead of stopping a later release before promotion.
async function checkPathClassification() {
  const headSha = await command("git", ["rev-parse", "HEAD"]);
  const base = await command("git", [
    "merge-base",
    exactSha(required("BASE_SHA"), "Base SHA"),
    headSha,
  ]);
  const { unclassifiedPaths } = await persistedContractChanges({
    baseline: { sha: base },
    sha: headSha,
  });
  if (unclassifiedPaths.length > 0)
    fail(
      `Release cannot classify these paths for production-data compatibility: ${unclassifiedPaths.join(", ")}. ` +
        "Add a pattern to KNOWN_UNRELATED_PATTERNS or PERSISTED_CONTRACT_PATTERNS in scripts/release-controls.js.",
    );
}

async function planRecoveryCompatibility() {
  const state = await loadState();
  validateConfiguredPlatform(state);
  const plan = await recoveryCompatibilityPlan(state);
  await appendOutputs({ required: String(plan.required) });
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

function smokeOutcome(results) {
  if (!Array.isArray(results)) return "regression";
  // No report at all means the run never produced results (install/runner failure), not a release defect.
  if (!results.length) return "infrastructure";
  const found = (project, title) =>
    results.filter((r) => r.project === project && r.title === title);
  if (SMOKE_EXPECTED.some(([project, title]) => !found(project, title).length))
    return "regression";
  const failed = results.filter(
    (r) => !["expected", "flaky"].includes(r.status),
  );
  if (!failed.length) return "pass";
  const sessionDown = new Set(
    failed
      .filter((r) => r.title === SMOKE_SESSION && r.status === "unexpected")
      .map((r) => r.project),
  );
  return failed.every(
    (r) =>
      sessionDown.has(r.project) &&
      (r.title === SMOKE_SESSION ||
        (r.title === SMOKE_TEAM && r.status === "skipped")),
  )
    ? "infrastructure"
    : "regression";
}

async function authLockVersion(sha) {
  const version = (await shaAt(sha, "pnpm-lock.yaml")).match(
    /^ {2}better-auth@([^\s:(]+)/m,
  )?.[1];
  if (!version) fail("better-auth version not found in pnpm-lock.yaml");
  return version;
}

async function authEnvChanged(state) {
  const created = Number(
    (await deployment(state.baseline.deploymentId)).createdAt,
  );
  if (!Number.isFinite(created))
    fail("Baseline deployment has no creation time");
  // Metadata only: never request decrypted values.
  const { envs, pagination } = await vercel(
    `/v10/projects/${required("VERCEL_PROJECT_ID")}/env`,
  );
  if (!Array.isArray(envs) || pagination?.next)
    fail("Vercel env inventory is incomplete");
  return envs.some(
    (env) =>
      AUTH_ENV_PATTERN.test(env.key) &&
      [].concat(env.target).includes("production") &&
      !(Number(env.updatedAt) <= created),
  );
}

async function authChange(state) {
  try {
    if (
      (await changedSourcePaths(state)).some((file) =>
        AUTH_CONTRACT_PATTERNS.some((pattern) => pattern.test(file)),
      )
    )
      return "changed";
    const [baseline, release] = await Promise.all(
      [state.baseline.sha, state.sha].map(authLockVersion),
    );
    return baseline !== release || (await authEnvChanged(state))
      ? "changed"
      : "unchanged";
  } catch {
    return "unknown";
  }
}

async function smokeVerdict(state) {
  const before = {
    deploymentId: required("SMOKE_BEFORE_DEPLOYMENT_ID"),
    sha: required("SMOKE_BEFORE_SHA"),
  };
  const after = await currentAlias();
  const isCandidate = (alias) =>
    alias.deploymentId === state.candidateId && alias.sha === state.sha;
  const outcome =
    isCandidate(before) && isCandidate(after)
      ? smokeOutcome(json(required("SMOKE_RESULTS"), "smoke results"))
      : "regression";
  return { before, after, outcome, auth: await authChange(state) };
}

async function summarizeSmoke() {
  const report = json(
    await readFile(required("SMOKE_REPORT_FILE"), "utf8").catch(
      () => '{"suites":[]}',
    ),
    "Playwright report",
  );
  const results = [];
  const walk = (suites = []) =>
    suites.forEach((suite) => {
      for (const spec of suite.specs || [])
        for (const test of spec.tests || [])
          results.push({
            project: test.projectName,
            title: spec.title,
            status: test.status,
          });
      walk(suite.suites);
    });
  walk(report.suites);
  await appendOutputs({ smoke_results: JSON.stringify(results) });
}

async function classifySmoke() {
  const state = await loadState();
  validateConfiguredPlatform(state);
  const { after, outcome, auth } = await smokeVerdict(state);
  await appendOutputs({
    outcome,
    auth,
    after_deployment_id: after.deploymentId,
    after_sha: after.sha,
    auto_accept: String(outcome === "pass" && auth === "unchanged"),
  });
}

function productionQAReceipt(state, approval) {
  return {
    binding: `${state.candidateId}:${state.sha}:${state.productionAlias}`,
    runId: state.releaseRunId,
    runAttempt: state.releaseRunAttempt,
    approval,
  };
}

async function recordSmokeAcceptance() {
  const state = await loadState();
  validateConfiguredPlatform(state);
  // Classify already judged the smoke; this only re-checks its handed-over verdict, with no network.
  const before = {
    deploymentId: required("SMOKE_BEFORE_DEPLOYMENT_ID"),
    sha: required("SMOKE_BEFORE_SHA"),
  };
  const after = {
    deploymentId: required("SMOKE_AFTER_DEPLOYMENT_ID"),
    sha: required("SMOKE_AFTER_SHA"),
  };
  if (
    required("SMOKE_OUTCOME") !== "pass" ||
    required("SMOKE_AUTH") !== "unchanged" ||
    required("SMOKE_AUTO_ACCEPT") !== "true" ||
    [before, after].some(
      (alias) =>
        alias.deploymentId !== state.candidateId || alias.sha !== state.sha,
    )
  )
    fail(
      "Smoke acceptance refused: classification is not an unchanged-auth pass on the candidate",
    );
  const jobs = await workflowJobs(state.releaseRunId);
  state.productionQA = productionQAReceipt(state, {
    kind: "smoke",
    jobs: SMOKE_JOBS.map((name) =>
      jobEvidence(successfulJob(jobs, name, state.releaseRunAttempt)),
    ),
    before,
    after,
  });
  await writeState(required("RELEASE_FINAL_STATE_FILE"), state);
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

async function recordProductionQA() {
  const state = await loadState();
  validateConfiguredPlatform(state);
  // Finalize and production QA never move production, so receipt expiry must not block them.
  await verifyRecoveryEvidence(state, state.releaseRunId, {
    ignoreExpiry: true,
  });
  const production = await currentAlias();
  if (
    production.deploymentId !== state.candidateId ||
    production.sha !== state.sha
  )
    fail("Production QA does not target the promoted candidate");
  state.productionQA = productionQAReceipt(state, {
    kind: "human",
    ...(await protectedJobReceipt(ACCEPTANCE_JOBS.human, REVIEW_ENVIRONMENT)),
  });
  await writeState(required("RELEASE_FINAL_STATE_FILE"), state);
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
