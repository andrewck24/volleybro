#!/usr/bin/env node
import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const api = "https://api.vercel.com";
const shaPattern = /^[0-9a-f]{40}$/;
const digestPattern = /^sha256:([0-9a-f]{64})$/;
const releaseStateVersion = 2;
const productionWorkflow = ".github/workflows/production-release.yml";
const ciWorkflow = ".github/workflows/ci.yml";
const reviewEnvironment = "production-release-review";
const sourceQAScopes = [
  ["unit", "Test", "Test source"],
  ["integration", "Integration", "Integration source"],
];

function fail(message) {
  throw new Error(message);
}

function required(name) {
  const value = process.env[name];
  if (!value) fail(`Missing required environment value: ${name}`);
  return value;
}

async function command(bin, args, options = {}) {
  try {
    const result = await execFile(bin, args, {
      maxBuffer: 8 * 1024 * 1024,
      ...options,
    });
    return result.stdout.trim();
  } catch (error) {
    fail(`${bin} ${args[0]} failed: ${error.stderr?.trim() || error.message}`);
  }
}

async function vercel(path, options = {}) {
  const team = process.env.VERCEL_TEAM_ID;
  const url = new URL(`${api}${path}`);
  if (team) url.searchParams.set("teamId", team);
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(30_000),
    headers: {
      Authorization: `Bearer ${required("VERCEL_TOKEN")}`,
      ...(options.body && { "Content-Type": "application/json" }),
    },
  });
  if (!response.ok) fail(`Vercel API ${response.status} for ${path}`);
  const body = await response.text();
  return body ? json(body, "Vercel API response") : undefined;
}

async function moveProduction(endpoint, expected, previous) {
  let requestError;
  try {
    await vercel(endpoint, { method: "POST", body: "{}" });
  } catch (error) {
    requestError = error;
  }
  const deadline = Date.now() + 120_000;
  do {
    const actual = await currentAlias();
    if (
      actual.deploymentId === expected.deploymentId &&
      actual.sha === expected.sha
    )
      return;
    if (
      actual.deploymentId !== previous.deploymentId ||
      actual.sha !== previous.sha
    )
      fail("Production alias changed to an unexpected deployment or source");
    if (requestError) throw requestError;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  } while (Date.now() < deadline);
  fail("Production transition not confirmed; stop for human recovery");
}

async function github(path) {
  const repository = required("GITHUB_REPOSITORY");
  return JSON.parse(
    await command("gh", ["api", `repos/${repository}/${path}`]),
  );
}

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

async function shaAt(ref, path) {
  return command("git", ["show", `${ref}:${path}`]);
}

function json(value, label) {
  try {
    return JSON.parse(value);
  } catch {
    fail(`Invalid JSON in ${label}`);
  }
}

function exactSha(value, label) {
  const sha = String(value || "").toLowerCase();
  if (!shaPattern.test(sha)) fail(`${label} must be a full 40-character SHA`);
  return sha;
}

function positiveInteger(value, label) {
  const result = String(value || "");
  if (!/^[1-9]\d*$/.test(result)) fail(`${label} must be a positive integer`);
  return result;
}

function workflowFile(run) {
  return String(run?.path || "").split("@")[0];
}

function httpsEvidence(value, label) {
  const raw = String(value || "");
  if (!raw || raw.trim() !== raw || /[\r\n]/.test(raw))
    fail(`${label} must be one HTTPS URL`);
  let url;
  try {
    url = new URL(raw);
  } catch {
    fail(`${label} must be one HTTPS URL`);
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !url.hostname
  )
    fail(`${label} must be one HTTPS URL`);
  return url.href;
}

function hostname(value, label) {
  const raw = String(value || "").toLowerCase();
  let url;
  try {
    url = new URL(`https://${raw}`);
  } catch {
    fail(`${label} must be a hostname`);
  }
  if (
    !raw ||
    url.hostname !== raw ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.port
  )
    fail(`${label} must be a hostname`);
  return raw;
}

function stateReleaseRun(state) {
  return {
    runId: positiveInteger(state.releaseRunId, "Release state run ID"),
    runAttempt: positiveInteger(
      state.releaseRunAttempt,
      "Release state run attempt",
    ),
  };
}

function validateStateSchema(state) {
  if (state.stateVersion !== releaseStateVersion)
    fail("Release state does not use the current QA receipt contract");
  exactSha(state.sha, "Release state SHA");
  exactSha(state.controllerSha, "Release state controller SHA");
  positiveInteger(state.releaseRunId, "Release state run ID");
  positiveInteger(state.releaseRunAttempt, "Release state run attempt");
  if (!state.candidateId || !state.baseline?.deploymentId)
    fail("Release state is missing deployment identity");
  if (!state.projectId || !state.productionAlias)
    fail("Release state is missing its platform binding");
}

function validateConfiguredPlatform(state) {
  validateStateSchema(state);
  if (
    state.projectId !== required("VERCEL_PROJECT_ID") ||
    state.productionAlias !==
      hostname(required("PRODUCTION_ALIAS"), "Production alias")
  )
    fail("Release state platform binding does not match current configuration");
}

function validateWorkflowRun(
  run,
  { id, path: expectedPath, repository, event, sha, attempt } = {},
) {
  if (
    (id && String(run?.id) !== String(id)) ||
    workflowFile(run) !== expectedPath ||
    run.repository?.full_name !== repository ||
    run.head_repository?.full_name !== repository ||
    (event && run.event !== event) ||
    (sha && run.head_sha !== sha) ||
    (attempt && String(run.run_attempt) !== String(attempt))
  )
    fail(`Untrusted ${expectedPath || "workflow"} run provenance`);
  return run;
}

async function workflowRun(id) {
  return github(`actions/runs/${positiveInteger(id, "Workflow run ID")}`);
}

async function workflowJobs(id) {
  const response = await github(
    `actions/runs/${positiveInteger(id, "Workflow run ID")}/jobs?filter=latest&per_page=100`,
  );
  if (
    !Array.isArray(response.jobs) ||
    response.total_count > response.jobs.length
  )
    fail("Workflow job inventory is incomplete");
  return response.jobs;
}

function successfulJob(jobs, name, attempt) {
  const matches = jobs.filter(
    (job) =>
      job.name === name &&
      (!job.run_attempt || String(job.run_attempt) === String(attempt)),
  );
  if (
    matches.length !== 1 ||
    matches[0].status !== "completed" ||
    matches[0].conclusion !== "success"
  )
    fail(`${name} is not a unique successful native workflow job`);
  return matches[0];
}

function jobEvidence(job) {
  return {
    id: positiveInteger(job.id, `${job.name} job ID`),
    name: job.name,
    conclusion: job.conclusion,
  };
}

function approvedHistory(history, environment) {
  if (!Array.isArray(history)) fail("Workflow approval history is invalid");
  const reviews = history
    .filter(
      (entry) =>
        entry.state === "approved" &&
        entry.environments?.some((item) => item.name === environment) &&
        entry.user?.login &&
        Number.isInteger(entry.user?.id),
    )
    .map((entry) => ({
      state: "approved",
      environments: entry.environments.map((item) => item.name).sort(),
      user: { login: entry.user.login, id: entry.user.id },
    }));
  if (!reviews.length) fail(`${environment} has no native approval history`);
  return reviews;
}

function sameReview(left, right) {
  return (
    left.state === right.state &&
    left.user?.login === right.user?.login &&
    left.user?.id === right.user?.id &&
    JSON.stringify(left.environments) === JSON.stringify(right.environments)
  );
}

async function nativeApprovalHistory(runId, environment) {
  return approvedHistory(
    await github(
      `actions/runs/${positiveInteger(runId, "Workflow run ID")}/approvals`,
    ),
    environment,
  );
}

function protectedJobKey(name) {
  const key = {
    "Accept source Preview": "source-preview-acceptance",
    "Accept candidate evidence": "candidate-acceptance",
    "Accept production QA": "production-acceptance",
  }[name];
  if (!key) fail(`Unknown protected workflow job: ${name}`);
  return key;
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
    path: productionWorkflow,
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
    receipt.environment !== reviewEnvironment ||
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
    path: productionWorkflow,
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

function deploymentSourceSha(value, label) {
  const candidates = [value.meta?.releaseSha, value.meta?.githubCommitSha]
    .filter(Boolean)
    .map((sha) => exactSha(sha, `${label} source SHA`));
  if (!candidates.length || new Set(candidates).size !== 1)
    fail(`${label} has no single trustworthy source SHA`);
  return candidates[0];
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
  event,
  pr,
  expectedAuthor,
  repository,
  checkRuns,
  statuses,
}) {
  const mergeSha = event.pull_request?.merge_commit_sha;
  if (
    !event.pull_request?.merged ||
    !mergeSha ||
    pr.head.sha !== event.pull_request.head?.sha
  ) {
    fail("Only the exact merged pull request commit can authorize a release");
  }
  validateVersionPr(pr, expectedAuthor, repository);
  if (pr.state !== "closed" || !pr.merged || pr.merge_commit_sha !== mergeSha)
    fail("Version PR must be merged at this exact commit");
  validateRequiredChecks(pr.head.sha, checkRuns, statuses, repository);
  return mergeSha;
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

async function stagingDomains() {
  const id = required("VERCEL_PROJECT_ID");
  const project = await vercel(`/v9/projects/${id}`);
  if (
    project.id !== id ||
    project.ssoProtection?.deploymentType !== "all_except_custom_domains"
  )
    fail("Production staging requires project-bound Standard Protection");
  const result = await vercel(`/v9/projects/${id}/domains?limit=100`);
  if (!Array.isArray(result.domains) || result.pagination?.next)
    fail("Project domain inventory is incomplete");
  const production = result.domains.find(
    (domain) => domain.name === required("PRODUCTION_ALIAS"),
  );
  if (
    !production ||
    production.gitBranch ||
    production.customEnvironmentId ||
    production.redirect
  )
    fail("Production alias is not a production domain of this project");
  return new Set(result.domains.map((domain) => domain.name));
}

function validateCandidate(candidate, id, sha, domains) {
  if (
    candidate.id !== id ||
    candidate.readyState !== "READY" ||
    candidate.target !== "production" ||
    candidate.projectId !== required("VERCEL_PROJECT_ID")
  )
    fail("Candidate identity, readiness, or production target is invalid");
  if (deploymentSourceSha(candidate, "Candidate deployment") !== sha)
    fail("Candidate source SHA does not match the authorized release SHA");
  if (
    !Array.isArray(candidate.alias) ||
    candidate.alias.some(
      (alias) =>
        domains.has(alias) ||
        !Array.isArray(candidate.automaticAliases) ||
        !candidate.automaticAliases.includes(alias),
    )
  )
    fail("Candidate has a production or unknown alias");
}

function assertBaseline(actual, expected) {
  if (
    actual.deploymentId !== expected.deploymentId ||
    actual.updatedAt !== expected.updatedAt ||
    actual.sha !== expected.sha
  )
    fail("Production baseline changed while candidate was being reviewed");
}

async function assertRollbackEvidence(
  state,
  expectedRunId = state.releaseRunId,
) {
  const binding = `${state.baseline.deploymentId}:${state.candidateId}:${state.sha}`;
  const receipt = state.compatibility;
  if (
    !receipt ||
    receipt.binding !== binding ||
    receipt.runId !== String(expectedRunId) ||
    httpsEvidence(receipt.evidence, "Accepted recovery evidence") !==
      receipt.evidence
  )
    fail(
      "No accepted recovery evidence is bound to baseline, candidate, source, and release run",
    );
  await verifyProtectedJobReceipt(
    receipt.approval,
    expectedRunId,
    "Accept candidate evidence",
  );
}

function assertTagSha(actual, expected, tag) {
  if (actual && actual !== expected)
    fail(`${tag} already points at a different commit`);
}

function assertExistingTagSha(actual, expected, tag) {
  if (!actual) fail(`Could not verify remote target for ${tag}`);
  assertTagSha(actual, expected, tag);
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

function remoteTagTarget(output, tag) {
  const refs = new Map(
    output
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [sha, ref] = line.split("\t");
        return [ref, sha];
      }),
  );
  return refs.get(`refs/tags/${tag}^{}`) || refs.get(`refs/tags/${tag}`) || "";
}

async function isAncestor(base, head) {
  try {
    await execFile("git", ["merge-base", "--is-ancestor", base, head]);
    return true;
  } catch (error) {
    if (error.code === 1) return false;
    fail(`git merge-base failed: ${error.stderr?.trim() || error.message}`);
  }
}

async function assertAncestor(base, head, message) {
  if (!(await isAncestor(base, head))) fail(message);
}

function parsedVersion(value, label) {
  const match = String(value || "").match(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/,
  );
  if (!match) fail(`${label} is not a stable semantic version`);
  return match.slice(1).map(Number);
}

function assertPatchVersion(base, repair) {
  const [baseMajor, baseMinor, basePatch] = parsedVersion(
    base,
    "Deployed package version",
  );
  const [repairMajor, repairMinor, repairPatch] = parsedVersion(
    repair,
    "Hotfix package version",
  );
  if (
    repairMajor !== baseMajor ||
    repairMinor !== baseMinor ||
    repairPatch !== basePatch + 1
  ) {
    fail("Hotfix package version must be one patch above the deployed version");
  }
}

async function pendingChangesetsAt(ref) {
  const files = (
    await command("git", [
      "ls-tree",
      "-r",
      "--name-only",
      ref,
      "--",
      ".changeset",
    ])
  )
    .split("\n")
    .filter(
      (path) =>
        /^\.changeset\/[^/]+\.md$/.test(path) &&
        path !== ".changeset/README.md",
    );
  return new Map(
    await Promise.all(
      files.map(async (path) => [path, await shaAt(ref, path)]),
    ),
  );
}

function assertSameFiles(actual, expected, label) {
  if (
    actual.size !== expected.size ||
    [...expected].some(([path, contents]) => actual.get(path) !== contents)
  ) {
    fail(`${label} changed during merge-back`);
  }
}

async function verifyHotfixMetadata(base, repair) {
  const basePackageText = await shaAt(base, "package.json");
  const repairPackageText = await shaAt(repair, "package.json");
  const basePackage = json(basePackageText, "package.json");
  const repairPackage = json(repairPackageText, "package.json");
  assertPatchVersion(basePackage.version, repairPackage.version);
  const baseChangelog = await shaAt(base, "CHANGELOG.md");
  const repairChangelog = await shaAt(repair, "CHANGELOG.md");
  if (
    baseChangelog === repairChangelog ||
    !repairChangelog.includes(`## [${repairPackage.version}]`)
  ) {
    fail("Hotfix changelog must describe the patch version");
  }
  if ((await pendingChangesetsAt(repair)).size)
    fail("Hotfix release snapshot must not contain pending changesets");
  return {
    basePackage,
    repairPackage,
    basePackageText,
    repairPackageText,
    baseChangelog,
    repairChangelog,
  };
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

async function authorize() {
  const event = json(
    await (
      await import("node:fs/promises")
    ).readFile(required("GITHUB_EVENT_PATH"), "utf8"),
    "GitHub event",
  );
  const prNumber = event.pull_request?.number;
  const mergedSha = event.pull_request?.merge_commit_sha;
  if (!prNumber || mergedSha !== required("GITHUB_SHA"))
    fail("Only the exact merged pull request commit can authorize a release");
  const pr = await github(`pulls/${prNumber}`);
  const expectedAuthor = required("RELEASE_BOT_LOGIN");
  const [checks, statuses] = await Promise.all([
    github(`commits/${pr.head.sha}/check-runs?per_page=100`),
    github(`commits/${pr.head.sha}/statuses?per_page=100`),
  ]);
  const authorizedSha = validateAuthorization({
    event,
    pr,
    expectedAuthor,
    repository: required("GITHUB_REPOSITORY"),
    checkRuns: checks.check_runs,
    statuses,
  });
  if (authorizedSha !== required("GITHUB_SHA"))
    fail("Workflow checkout does not match the merged SHA");
  const parent = await command("git", ["rev-parse", `${mergedSha}^1`]);
  await verifyMetadataOnly(parent, mergedSha);
  validateReviewEnvironment(
    await github("environments/production-release-review"),
  );
  if (process.env.GITHUB_OUTPUT) {
    const fs = await import("node:fs/promises");
    await fs.appendFile(process.env.GITHUB_OUTPUT, `sha=${mergedSha}\n`);
  }
  process.stdout.write(
    `${JSON.stringify({ sha: mergedSha, version: json(await shaAt(mergedSha, "package.json"), "package.json").version })}\n`,
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
  const pr = await github(`pulls/${pullRequest}`);
  const [checks, statuses, environment] = await Promise.all([
    github(`commits/${pr.head.sha}/check-runs?per_page=100`),
    github(`commits/${pr.head.sha}/statuses?per_page=100`),
    github("environments/production-release-review"),
  ]);
  validateAuthorization({
    event: {
      pull_request: {
        merged: true,
        merge_commit_sha: sha,
        head: { sha: pr.head.sha },
      },
    },
    pr,
    expectedAuthor: required("RELEASE_BOT_LOGIN"),
    repository: required("GITHUB_REPOSITORY"),
    checkRuns: checks.check_runs,
    statuses,
  });
  const parent = await command("git", ["rev-parse", `${sha}^1`]);
  await verifyMetadataOnly(parent, sha);
  validateReviewEnvironment(environment);
  const authorization = {
    owner,
    runId,
    pullRequest,
    sha,
    mode: "normal-retry",
    reviewedSourceSha: exactSha(pr.head.sha, "Version PR head SHA"),
  };
  const fs = await import("node:fs/promises");
  await fs.appendFile(
    required("GITHUB_OUTPUT"),
    `sha=${sha}\nrelease_authorization=${JSON.stringify(authorization)}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({ sha, version: json(await shaAt(sha, "package.json"), "package.json").version, authorization })}\n`,
  );
}

function releaseOwnerContext() {
  const owner = required("RELEASE_OWNER_LOGIN");
  if (
    required("GITHUB_ACTOR") !== owner ||
    required("GITHUB_TRIGGERING_ACTOR") !== owner ||
    required("GITHUB_EVENT_NAME") !== "workflow_dispatch" ||
    required("GITHUB_REF") !== "refs/heads/main"
  ) {
    fail(
      "Manual release requires release owner dispatch and rerun on trusted main",
    );
  }
  return { owner, runId: required("GITHUB_RUN_ID") };
}

function validateReleaseAuthorization(authorization, sha) {
  const { owner, runId } = releaseOwnerContext();
  if (
    authorization?.owner !== owner ||
    authorization.runId !== runId ||
    authorization.sha !== sha ||
    !["normal-retry", "hotfix"].includes(authorization.mode) ||
    !/^\d+$/.test(authorization.pullRequest)
  )
    fail(
      "Manual release authorization does not match this owner, run and release SHA",
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
    const fs = await import("node:fs/promises");
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
    await (
      await import("node:fs/promises")
    ).readFile(required("GITHUB_EVENT_PATH"), "utf8"),
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

async function deployment(id) {
  return vercel(`/v13/deployments/${encodeURIComponent(id)}`);
}

async function currentAlias() {
  const alias = await vercel(
    `/v4/aliases/${encodeURIComponent(required("PRODUCTION_ALIAS"))}`,
  );
  if (
    !alias.deploymentId ||
    !alias.updatedAt ||
    alias.alias !== required("PRODUCTION_ALIAS")
  )
    fail("Production alias lookup returned unexpected data");
  const source = await deployment(alias.deploymentId);
  if (
    source.id !== alias.deploymentId ||
    source.projectId !== required("VERCEL_PROJECT_ID")
  )
    fail("Production alias deployment identity or project does not match");
  return {
    deploymentId: alias.deploymentId,
    updatedAt: String(alias.updatedAt),
    sha: deploymentSourceSha(source, "Production deployment"),
  };
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
    stateVersion: releaseStateVersion,
    candidateId: candidate.id,
    candidateUrl: `https://${candidateUrl.replace(/^https?:\/\//, "")}`,
    sha,
    controllerSha,
    projectId: required("VERCEL_PROJECT_ID"),
    productionAlias: hostname(required("PRODUCTION_ALIAS"), "Production alias"),
    releaseRunId: positiveInteger(required("GITHUB_RUN_ID"), "Release run ID"),
    releaseRunAttempt: positiveInteger(
      process.env.GITHUB_RUN_ATTEMPT || "1",
      "Release run attempt",
    ),
    baseline,
    ...(reviewedSource && { reviewedSource }),
    ...(authorization && { authorization }),
  };
  const outputPath = required("GITHUB_OUTPUT");
  const fs = await import("node:fs/promises");
  await fs.appendFile(
    outputPath,
    `candidate_id=${output.candidateId}\ncandidate_url=${output.candidateUrl}\nbaseline=${baseline.deploymentId}\nsha=${sha}\ncontroller_sha=${controllerSha}\n`,
  );
  await fs.writeFile(
    required("RELEASE_STATE_FILE"),
    `${JSON.stringify(output, null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify(output)}\n`);
}

async function writeState(file, state) {
  const fs = await import("node:fs/promises");
  await fs.writeFile(file, `${JSON.stringify(state, null, 2)}\n`);
}

async function appendOutputs(values) {
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  if (lines.some((line) => /[\r\n]/.test(line)))
    fail("GitHub output contains an unexpected newline");
  const fs = await import("node:fs/promises");
  await fs.appendFile(required("GITHUB_OUTPUT"), `${lines.join("\n")}\n`);
}

async function workflowBlob(ref) {
  const response = await github(
    `contents/${ciWorkflow}?ref=${encodeURIComponent(exactSha(ref, "Workflow ref"))}`,
  );
  if (
    response.path !== ciWorkflow ||
    !/^[0-9a-f]{40}$/.test(response.sha || "")
  )
    fail("CI workflow blob identity is invalid");
  return response.sha;
}

async function reusableSourceQA(state) {
  const scopes = { unit: null, integration: null };
  const repository = required("GITHUB_REPOSITORY");
  let workflow, sourceBlob, controllerBlob, response;
  try {
    [workflow, sourceBlob, controllerBlob, response] = await Promise.all([
      github("actions/workflows/ci.yml"),
      workflowBlob(state.sha),
      workflowBlob(state.controllerSha),
      github(
        `actions/workflows/ci.yml/runs?event=workflow_dispatch&head_sha=${state.sha}&per_page=100`,
      ),
    ]);
  } catch {
    return scopes;
  }
  if (
    workflow.path !== ciWorkflow ||
    !Number.isInteger(workflow.id) ||
    sourceBlob !== controllerBlob
  )
    return scopes;
  if (
    !Array.isArray(response.workflow_runs) ||
    response.total_count > response.workflow_runs.length
  )
    fail("CI workflow run inventory is incomplete");
  for (const run of response.workflow_runs) {
    try {
      validateWorkflowRun(run, {
        path: ciWorkflow,
        repository,
        event: "workflow_dispatch",
        sha: state.sha,
      });
      if (
        run.status !== "completed" ||
        run.workflow_id !== workflow.id ||
        !run.run_attempt
      )
        continue;
      const jobs = await workflowJobs(run.id);
      const shared = {
        kind: "ci-reuse",
        sourceSha: state.sha,
        producerRunId: String(run.id),
        producerRunAttempt: String(run.run_attempt),
        workflowId: String(workflow.id),
        workflowPath: ciWorkflow,
        workflowBlob: sourceBlob,
      };
      for (const [scope, name] of sourceQAScopes) {
        if (scopes[scope]) continue;
        try {
          scopes[scope] = {
            ...shared,
            scope,
            job: jobEvidence(successfulJob(jobs, name, run.run_attempt)),
          };
        } catch {
          continue;
        }
      }
      if (scopes.unit && scopes.integration) break;
    } catch {
      continue;
    }
  }
  return scopes;
}

async function verifyReusableSourceQA(state, receipt, expectedName) {
  const repository = required("GITHUB_REPOSITORY");
  const [workflow, run, jobs, sourceBlob, controllerBlob] = await Promise.all([
    github("actions/workflows/ci.yml"),
    workflowRun(receipt.producerRunId),
    workflowJobs(receipt.producerRunId),
    workflowBlob(state.sha),
    workflowBlob(state.controllerSha),
  ]);
  validateWorkflowRun(run, {
    id: receipt.producerRunId,
    path: ciWorkflow,
    repository,
    event: "workflow_dispatch",
    sha: state.sha,
    attempt: receipt.producerRunAttempt,
  });
  if (
    run.status !== "completed" ||
    String(run.workflow_id) !== receipt.workflowId ||
    workflow.path !== ciWorkflow ||
    String(workflow.id) !== receipt.workflowId ||
    sourceBlob !== controllerBlob ||
    receipt.workflowBlob !== sourceBlob
  )
    fail("Reusable source QA producer is no longer trusted");
  const actual = jobEvidence(
    successfulJob(jobs, expectedName, receipt.producerRunAttempt),
  );
  if (JSON.stringify(actual) !== JSON.stringify(receipt.job))
    fail("Reusable source QA native job receipt changed");
}

function normalizedRecoveryInput(state) {
  const binding = process.env.RELEASE_ROLLBACK_COMPATIBILITY || "";
  const evidence = process.env.RELEASE_ROLLBACK_EVIDENCE || "";
  if (!binding && !evidence) return null;
  if (!binding || !evidence)
    fail("Required recovery evidence must include binding and HTTPS proof");
  const exactBinding = `${state.baseline.deploymentId}:${state.candidateId}:${state.sha}`;
  const directPrebinding = `${state.baseline.deploymentId}:${state.sha}`;
  const reviewedPrebinding = state.reviewedSource
    ? `${state.baseline.deploymentId}:${state.reviewedSource.reviewedSha}`
    : "";
  if (![exactBinding, directPrebinding, reviewedPrebinding].includes(binding))
    fail("Required recovery evidence does not match this baseline and source");
  return {
    binding: exactBinding,
    evidence: httpsEvidence(evidence, "Recovery evidence"),
    suppliedBinding: binding,
    ...(binding === reviewedPrebinding && {
      sourceMapping: state.reviewedSource,
    }),
  };
}

async function inspectSourceQA() {
  const state = await loadState();
  validateConfiguredPlatform(state);
  const sourceQAPlan = await reusableSourceQA(state);
  const sourceQAGapInput = process.env.RELEASE_SOURCE_QA_GAP || "";
  if (
    sourceQAGapInput !== sourceQAGapInput.trim() ||
    /[\r\n]/.test(sourceQAGapInput)
  )
    fail("Source QA gap must be one trimmed line");
  const sourceQAGap = sourceQAGapInput;
  state.sourceQA = null;
  state.sourceQAPlan = sourceQAPlan;
  state.sourceQAGap = sourceQAGap || null;
  state.recoveryInput = normalizedRecoveryInput(state);
  await writeState(required("RELEASE_STATE_FILE"), state);
  await appendOutputs({
    source_qa_needed:
      sourceQAPlan.unit && sourceQAPlan.integration ? "false" : "true",
    source_unit_needed: sourceQAPlan.unit ? "false" : "true",
    source_integration_needed: sourceQAPlan.integration ? "false" : "true",
    source_preview_needed: sourceQAGap ? "true" : "false",
    recovery_binding: state.recoveryInput?.binding || "",
    recovery_evidence: state.recoveryInput?.evidence || "",
  });
}

function validatePreview(deploymentValue, id, state) {
  if (
    deploymentValue.id !== id ||
    deploymentValue.readyState !== "READY" ||
    ![null, "preview"].includes(deploymentValue.target ?? null) ||
    deploymentValue.projectId !== state.projectId ||
    deploymentSourceSha(deploymentValue, "Source Preview") !== state.sha
  )
    fail(
      "Source Preview identity, readiness, project, target, or SHA is invalid",
    );
}

async function aliasDeployment(alias) {
  const result = await vercel(`/v4/aliases/${encodeURIComponent(alias)}`);
  if (result.alias !== alias || !result.deploymentId)
    fail("Alias lookup returned unexpected data");
  return result.deploymentId;
}

async function setPreviewAlias(deploymentId, alias) {
  let requestError;
  try {
    await vercel(
      `/v2/deployments/${encodeURIComponent(deploymentId)}/aliases`,
      {
        method: "POST",
        body: JSON.stringify({ alias }),
      },
    );
  } catch (error) {
    requestError = error;
  }
  const deadline = Date.now() + 120_000;
  do {
    if ((await aliasDeployment(alias)) === deploymentId) return;
    if (requestError) throw requestError;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  } while (Date.now() < deadline);
  fail("Source Preview alias transition was not confirmed");
}

async function prepareSourcePreview() {
  const state = await loadState();
  validateConfiguredPlatform(state);
  if (!state.sourceQAGap) fail("No explicit source QA gap requires a Preview");
  if ((await command("git", ["rev-parse", "HEAD"])) !== state.sha)
    fail("Source Preview checkout does not match the authorized release SHA");
  const alias = hostname(required("INTEGRATION_ALIAS"), "Integration alias");
  if (alias === state.productionAlias)
    fail("Integration alias must not be the production alias");
  const domains = await stagingDomains();
  if (domains.has(alias))
    fail("Integration alias must not be a production project domain");
  const result = json(
    await command(
      "pnpm",
      [
        "dlx",
        "vercel@61.1.0",
        "deploy",
        "--yes",
        "--json",
        "--token",
        required("VERCEL_TOKEN"),
        "--meta",
        `releaseSha=${state.sha}`,
        "--meta",
        `releaseRun=${state.releaseRunId}`,
      ],
      {
        env: {
          ...process.env,
          VERCEL_PROJECT_ID: state.projectId,
          VERCEL_ORG_ID: required("VERCEL_ORG_ID"),
        },
      },
    ),
    "Vercel Preview deploy output",
  );
  const id = result.id || result.deployment?.id;
  if (!id) fail("Vercel Preview deploy output did not include an ID");
  validatePreview(await deployment(id), id, state);
  await setPreviewAlias(id, alias);
  validatePreview(await deployment(id), id, state);
  if ((await aliasDeployment(alias)) !== id)
    fail("Fixed integration alias does not point to the source Preview");
  state.sourcePreview = { deploymentId: id, alias, gap: state.sourceQAGap };
  await writeState(required("RELEASE_STATE_FILE"), state);
  await appendOutputs({ preview_id: id, preview_url: `https://${alias}` });
}

async function completedProtectedJobReceipt(name, runId, runAttempt) {
  const repository = required("GITHUB_REPOSITORY");
  const [run, jobs, reviews] = await Promise.all([
    workflowRun(runId),
    workflowJobs(runId),
    nativeApprovalHistory(runId, reviewEnvironment),
  ]);
  validateWorkflowRun(run, {
    id: runId,
    path: productionWorkflow,
    repository,
    attempt: runAttempt,
  });
  const job = successfulJob(jobs, name, runAttempt);
  return {
    runId: String(runId),
    runAttempt: String(runAttempt),
    githubJob: protectedJobKey(name),
    jobId: String(job.id),
    jobName: name,
    environment: reviewEnvironment,
    reviewHistory: reviews,
  };
}

async function releaseSourceScope(state, scope, name) {
  const { runId, runAttempt } = stateReleaseRun(state);
  const repository = required("GITHUB_REPOSITORY");
  const [run, jobs] = await Promise.all([
    workflowRun(runId),
    workflowJobs(runId),
  ]);
  validateWorkflowRun(run, {
    id: runId,
    path: productionWorkflow,
    repository,
    attempt: runAttempt,
  });
  return {
    kind: "release-run",
    scope,
    sourceSha: state.sha,
    producerRunId: runId,
    producerRunAttempt: runAttempt,
    workflowPath: productionWorkflow,
    job: jobEvidence(successfulJob(jobs, name, runAttempt)),
  };
}

function assertSourceQAReceipt(state, expectedRunId = state.releaseRunId) {
  const receipt = state.sourceQA;
  if (
    !receipt ||
    receipt.sourceSha !== state.sha ||
    receipt.boundRunId !== String(expectedRunId) ||
    receipt.boundRunAttempt !== String(state.releaseRunAttempt) ||
    !receipt.scopes ||
    !["unit", "integration"].every((scope) => {
      const evidence = receipt.scopes[scope];
      return (
        evidence?.scope === scope &&
        evidence.sourceSha === state.sha &&
        ["ci-reuse", "release-run"].includes(evidence.kind) &&
        evidence.job?.id &&
        evidence.job?.name &&
        evidence.job?.conclusion === "success"
      );
    })
  )
    fail("No exact-source QA receipt is bound to this release run");
  if (
    state.sourceQAGap &&
    (!receipt.preview ||
      receipt.preview.gap !== state.sourceQAGap ||
      receipt.preview.sourceSha !== state.sha)
  )
    fail("Source QA gap has no accepted exact-source Preview receipt");
}

async function recordSourceQA() {
  const state = await loadState();
  validateConfiguredPlatform(state);
  const scopes = {};
  for (const [scope, reusedName, fallbackName] of sourceQAScopes) {
    const reused = state.sourceQAPlan?.[scope];
    if (reused) {
      await verifyReusableSourceQA(state, reused, reusedName);
      scopes[scope] = reused;
    } else {
      scopes[scope] = await releaseSourceScope(state, scope, fallbackName);
    }
  }
  state.sourceQA = {
    sourceSha: state.sha,
    boundRunId: state.releaseRunId,
    boundRunAttempt: state.releaseRunAttempt,
    scopes,
  };
  if (state.sourceQAGap) {
    const previewId = required("SOURCE_PREVIEW_ID");
    validatePreview(await deployment(previewId), previewId, state);
    const alias = hostname(required("INTEGRATION_ALIAS"), "Integration alias");
    if (
      alias === state.productionAlias ||
      (await aliasDeployment(alias)) !== previewId
    )
      fail("Accepted source Preview is not on the fixed integration alias");
    state.sourceQA.preview = {
      deploymentId: previewId,
      alias,
      gap: state.sourceQAGap,
      sourceSha: state.sha,
      approval: await completedProtectedJobReceipt(
        "Accept source Preview",
        state.releaseRunId,
        state.releaseRunAttempt,
      ),
    };
  } else if (process.env.SOURCE_PREVIEW_ID) {
    fail("Unexpected source Preview supplied without a recorded QA gap");
  }
  assertSourceQAReceipt(state);
  delete state.sourceQAPlan;
  await writeState(required("RELEASE_STATE_FILE"), state);
}

function validateRecoveryMarker(state) {
  const { owner, runId } = releaseOwnerContext();
  if (
    !state.recovery?.verified ||
    state.recovery.owner !== owner ||
    state.recovery.runId !== runId ||
    state.recovery.runAttempt !== required("GITHUB_RUN_ATTEMPT") ||
    state.recovery.originalRunId !== String(state.releaseRunId)
  )
    fail("Recovery state is not verified for this owner and workflow run");
}

async function loadState({ allowRecovery = false } = {}) {
  const state = json(
    await (
      await import("node:fs/promises")
    ).readFile(required("RELEASE_STATE_FILE"), "utf8"),
    "release state",
  );
  if (state.stateVersion === releaseStateVersion) {
    validateStateSchema(state);
    if (state.recovery) {
      if (!allowRecovery) fail("Recovery state is not valid for this action");
      validateRecoveryMarker(state);
    } else if (
      state.releaseRunId !== required("GITHUB_RUN_ID") ||
      state.releaseRunAttempt !== (process.env.GITHUB_RUN_ATTEMPT || "1")
    ) {
      fail("Release state belongs to a different workflow run or attempt");
    }
  }
  if (
    !state.recovery &&
    (state.authorization ||
      process.env.GITHUB_EVENT_NAME === "workflow_dispatch")
  )
    validateReleaseAuthorization(state.authorization, state.sha);
  return state;
}

async function promote() {
  const state = await loadState();
  validateConfiguredPlatform(state);
  if (state.sha !== required("RELEASE_SHA")) fail("Release state SHA mismatch");
  await assertRollbackEvidence(state);
  await verifySourceQANative(state);
  assertBaseline(await currentAlias(), state.baseline);
  const candidate = await deployment(state.candidateId);
  validateCandidate(
    candidate,
    state.candidateId,
    state.sha,
    await stagingDomains(),
  );
  await moveProduction(
    `/v10/projects/${required("VERCEL_PROJECT_ID")}/promote/${state.candidateId}`,
    { deploymentId: state.candidateId, sha: state.sha },
    state.baseline,
  );
}

async function rollbackIfCompatible() {
  const state = await loadState({ allowRecovery: true });
  validateConfiguredPlatform(state);
  assertSourceQAReceipt(state);
  const candidate = await currentAlias();
  if (
    candidate.deploymentId !== state.candidateId ||
    candidate.sha !== state.sha
  )
    fail("Production alias changed; refusing rollback");
  await assertRollbackEvidence(state, state.recovery?.originalRunId);
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

async function recordCompatibility() {
  const state = await loadState();
  validateStateSchema(state);
  const binding = `${state.baseline.deploymentId}:${state.candidateId}:${state.sha}`;
  if (
    !process.env.RELEASE_ROLLBACK_EVIDENCE ||
    !process.env.RELEASE_ROLLBACK_COMPATIBILITY
  )
    fail("Required recovery evidence is missing");
  const evidence = httpsEvidence(
    required("RELEASE_ROLLBACK_EVIDENCE"),
    "Required recovery evidence",
  );
  if (
    !state.recoveryInput ||
    state.recoveryInput.binding !== binding ||
    state.recoveryInput.evidence !== evidence ||
    required("RELEASE_ROLLBACK_COMPATIBILITY") !== binding
  )
    fail("Required recovery evidence was not frozen for this exact release");
  assertSourceQAReceipt(state);
  state.compatibility = {
    binding,
    evidence,
    runId: state.releaseRunId,
    runAttempt: state.releaseRunAttempt,
    approval: await protectedJobReceipt(
      "Accept candidate evidence",
      reviewEnvironment,
    ),
  };
  await writeState(required("RELEASE_ACCEPTED_STATE_FILE"), state);
  const summary = `Required recovery evidence recorded for ${binding}: ${evidence}`;
  if (process.env.GITHUB_STEP_SUMMARY)
    await (
      await import("node:fs/promises")
    ).appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
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

async function recordProductionQA() {
  const state = await loadState();
  validateConfiguredPlatform(state);
  assertSourceQAReceipt(state);
  await assertRollbackEvidence(state);
  const production = await currentAlias();
  if (
    production.deploymentId !== state.candidateId ||
    production.sha !== state.sha
  )
    fail("Production QA does not target the promoted candidate");
  state.productionQA = {
    binding: `${state.candidateId}:${state.sha}:${state.productionAlias}`,
    runId: state.releaseRunId,
    runAttempt: state.releaseRunAttempt,
    approval: await protectedJobReceipt(
      "Accept production QA",
      reviewEnvironment,
    ),
  };
  await writeState(required("RELEASE_FINAL_STATE_FILE"), state);
}

async function finalize() {
  const state = await loadState();
  validateConfiguredPlatform(state);
  assertProductionQAReceipt(state);
  assertSourceQAReceipt(state);
  await assertRollbackEvidence(state);
  await verifyProtectedJobReceipt(
    state.productionQA.approval,
    state.releaseRunId,
    "Accept production QA",
  );
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
    await command("git", ["push", "origin", `refs/tags/${tag}`]).catch(
      () => undefined,
    );
    remote = await lookupRemoteTag();
  }
  assertExistingTagSha(remoteTagTarget(remote, tag), state.sha, tag);
  const existing = await command("gh", [
    "release",
    "view",
    tag,
    "--json",
    "tagName",
  ]).catch(() => "");
  if (!existing)
    await command("gh", [
      "release",
      "create",
      tag,
      "--target",
      state.sha,
      "--title",
      tag,
      "--generate-notes",
    ]);
}

async function verifySourceQANative(state) {
  assertSourceQAReceipt(state, state.releaseRunId);
  for (const [scope, reusedName, fallbackName] of sourceQAScopes) {
    const evidence = state.sourceQA.scopes[scope];
    if (evidence.kind === "ci-reuse") {
      await verifyReusableSourceQA(state, evidence, reusedName);
      continue;
    }
    const [run, jobs] = await Promise.all([
      workflowRun(evidence.producerRunId),
      workflowJobs(evidence.producerRunId),
    ]);
    validateWorkflowRun(run, {
      id: state.releaseRunId,
      path: productionWorkflow,
      repository: required("GITHUB_REPOSITORY"),
      attempt: state.releaseRunAttempt,
    });
    const actual = jobEvidence(
      successfulJob(jobs, fallbackName, state.releaseRunAttempt),
    );
    if (JSON.stringify(actual) !== JSON.stringify(evidence.job))
      fail(`${scope} source QA native job receipt changed`);
  }
  if (state.sourceQA.preview) {
    const preview = state.sourceQA.preview;
    if ((await aliasDeployment(preview.alias)) !== preview.deploymentId)
      fail(
        "Accepted source Preview alias changed; fresh source QA is required",
      );
    validatePreview(
      await deployment(preview.deploymentId),
      preview.deploymentId,
      state,
    );
    await verifyProtectedJobReceipt(
      preview.approval,
      state.releaseRunId,
      "Accept source Preview",
    );
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
  } else if (run.event !== "pull_request" || run.head_sha !== state.sha) {
    fail("Original automatic release authorization is invalid");
  }
}

async function downloadAcceptedState(artifact, repository) {
  const digest = String(artifact.digest || "").match(digestPattern)?.[1];
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
  const fs = await import("node:fs/promises");
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
    path: productionWorkflow,
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
    path: productionWorkflow,
    repository,
  });
  if (
    originalJobs.some(
      (job) =>
        ["Accept production QA", "finalize-release"].includes(job.name) &&
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
  validateConfiguredPlatform(state);
  if (
    state.releaseRunId !== originalRunId ||
    state.releaseRunAttempt !== String(originalRun.run_attempt)
  )
    fail("Accepted state does not belong to the original run and attempt");
  validateOriginalAuthorization(state, originalRun);
  await verifySourceQANative(state);
  await assertRollbackEvidence(state, originalRunId);
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
    originalRunAttempt: state.releaseRunAttempt,
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
  const fs = await import("node:fs/promises");
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
  const fs = await import("node:fs/promises");
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
  const fs = await import("node:fs/promises");
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
  "inspect-source-qa": inspectSourceQA,
  "prepare-source-preview": prepareSourcePreview,
  "record-source-qa": recordSourceQA,
  promote,
  "rollback-if-compatible": rollbackIfCompatible,
  "record-compatibility": recordCompatibility,
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
