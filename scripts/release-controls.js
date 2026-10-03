#!/usr/bin/env node
import { execFile as execFileCallback } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const api = "https://api.vercel.com";
const shaPattern = /^[0-9a-f]{40}$/;

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

function assertRollbackEvidence(state) {
  const binding = `${state.baseline.deploymentId}:${state.candidateId}:${state.sha}`;
  const receipt = state.compatibility;
  if (
    !receipt ||
    receipt.binding !== binding ||
    receipt.runId !== required("GITHUB_RUN_ID") ||
    !/^https:\/\//.test(receipt.evidence || "")
  )
    fail(
      "No explicit compatibility evidence bound to baseline, candidate, and release SHA; production needs human recovery",
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
  const authorization = { owner, runId, pullRequest, sha };
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
  const authorization = { owner, runId, pullRequest, sha };
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
  if (source.id !== alias.deploymentId)
    fail("Production alias deployment identity does not match");
  return {
    deploymentId: alias.deploymentId,
    updatedAt: String(alias.updatedAt),
    sha: deploymentSourceSha(source, "Production deployment"),
  };
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
  const output = {
    candidateId: candidate.id,
    candidateUrl: `https://${candidateUrl.replace(/^https?:\/\//, "")}`,
    sha,
    controllerSha,
    baseline,
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

async function loadState() {
  const state = json(
    await (
      await import("node:fs/promises")
    ).readFile(required("RELEASE_STATE_FILE"), "utf8"),
    "release state",
  );
  if (
    state.authorization ||
    process.env.GITHUB_EVENT_NAME === "workflow_dispatch"
  )
    validateReleaseAuthorization(state.authorization, state.sha);
  return state;
}

async function promote() {
  const state = await loadState();
  if (state.sha !== required("RELEASE_SHA")) fail("Release state SHA mismatch");
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
  const state = await loadState();
  const candidate = await currentAlias();
  if (
    candidate.deploymentId !== state.candidateId ||
    candidate.sha !== state.sha
  )
    fail("Production alias changed; refusing rollback");
  assertRollbackEvidence(state);
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
  const binding = `${state.baseline.deploymentId}:${state.candidateId}:${state.sha}`;
  const suppliedBinding = process.env.RELEASE_ROLLBACK_COMPATIBILITY;
  const evidence = process.env.RELEASE_ROLLBACK_EVIDENCE;
  const accepted =
    suppliedBinding === binding &&
    /^https:\/\//.test(evidence || "") &&
    Boolean(process.env.GITHUB_RUN_ID);
  state.compatibility = accepted
    ? { binding, evidence, runId: required("GITHUB_RUN_ID") }
    : null;
  const fs = await import("node:fs/promises");
  await fs.writeFile(
    required("RELEASE_ACCEPTED_STATE_FILE"),
    `${JSON.stringify(state, null, 2)}\n`,
  );
  const summary = accepted
    ? `Rollback compatibility evidence recorded for ${binding}: ${evidence}`
    : `No rollback compatibility authority recorded for ${binding}; production recovery remains human-led.`;
  if (process.env.GITHUB_STEP_SUMMARY)
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  process.stdout.write(`${summary}\n`);
}

async function finalize() {
  const state = await loadState();
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
  promote,
  "rollback-if-compatible": rollbackIfCompatible,
  "record-compatibility": recordCompatibility,
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
