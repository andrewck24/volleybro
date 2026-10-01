#!/usr/bin/env node
import { execFile as execFileCallback } from "node:child_process";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const api = "https://api.vercel.com";

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

async function vercel(path) {
  const team = process.env.VERCEL_TEAM_ID;
  const url = new URL(`${api}${path}`);
  if (team) url.searchParams.set("teamId", team);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${required("VERCEL_TOKEN")}` },
  });
  if (!response.ok) fail(`Vercel API ${response.status} for ${path}`);
  return response.json();
}

function projectArgs() {
  return process.env.VERCEL_TEAM_SLUG
    ? ["--scope", process.env.VERCEL_TEAM_SLUG]
    : [];
}

async function github(path) {
  const repository = required("GITHUB_REPOSITORY");
  return JSON.parse(
    await command("gh", ["api", `repos/${repository}/${path}`]),
  );
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

export function validateAuthorization({
  event,
  pr,
  expectedAuthor,
  repository,
  requiredChecks,
  checkRuns,
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
  if (
    !requiredChecks.includes("Verify") ||
    !requiredChecks.some((name) => name.toLowerCase().includes("vercel"))
  ) {
    fail("Required checks must name Verify and the Vercel deployment check");
  }
  for (const name of requiredChecks) {
    const latest = checkRuns
      .filter((run) => run.name === name)
      .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at))[0];
    if (
      !latest ||
      latest.status !== "completed" ||
      latest.conclusion !== "success"
    )
      fail(`Latest required check is not successful: ${name}`);
  }
  return mergeSha;
}

export function validateVersionPr(pr, expectedAuthor, repository) {
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

export function validateCandidate(candidate, id, sha) {
  if (
    candidate.id !== id ||
    candidate.readyState !== "READY" ||
    candidate.target !== "production"
  )
    fail("Candidate identity, readiness, or production target is invalid");
  if (
    candidate.meta?.githubCommitSha !== sha &&
    candidate.meta?.releaseSha !== sha
  )
    fail("Candidate source SHA does not match the authorized release SHA");
  if (candidate.alias?.length) fail("Candidate already has an alias");
}

export function assertBaseline(actual, expected) {
  if (
    actual.deploymentId !== expected.deploymentId ||
    actual.updatedAt !== expected.updatedAt
  )
    fail("Production baseline changed while candidate was being reviewed");
}

export function assertRollbackEvidence(value, state) {
  if (
    value !== `${state.baseline.deploymentId}:${state.candidateId}:${state.sha}`
  )
    fail(
      "No explicit compatibility evidence bound to baseline, candidate, and release SHA; production needs human recovery",
    );
}

export function assertTagSha(actual, expected, tag) {
  if (actual && actual !== expected)
    fail(`${tag} already points at a different commit`);
}

export function validateReviewEnvironment(environment) {
  if (
    !environment.protection_rules?.some(
      (rule) => rule.type === "required_reviewers" && rule.reviewers?.length,
    )
  ) {
    fail("Production candidate QA environment has no required reviewers");
  }
}

export function remoteTagTarget(output, tag) {
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

export async function verifyMetadataOnly(base, head) {
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
  const checkNames = required("RELEASE_REQUIRED_CHECKS")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  const checks = await github(`commits/${pr.head.sha}/check-runs?per_page=100`);
  const authorizedSha = validateAuthorization({
    event,
    pr,
    expectedAuthor,
    repository: required("GITHUB_REPOSITORY"),
    requiredChecks: checkNames,
    checkRuns: checks.check_runs,
  });
  if (authorizedSha !== required("GITHUB_SHA"))
    fail("Workflow checkout does not match the merged SHA");
  const parent = await command("git", ["rev-parse", `${mergedSha}^1`]);
  await verifyMetadataOnly(parent, mergedSha);
  validateReviewEnvironment(
    await github("environments/production-release-review"),
  );
  process.stdout.write(
    `${JSON.stringify({ sha: mergedSha, version: json(await shaAt(mergedSha, "package.json"), "package.json").version })}\n`,
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
  return {
    deploymentId: alias.deploymentId,
    updatedAt: String(alias.updatedAt),
  };
}

async function stage() {
  const sha = required("RELEASE_SHA");
  if ((await command("git", ["rev-parse", "HEAD"])) !== sha)
    fail("Checkout is not the exact authorized release SHA");
  const baseline = await currentAlias();
  const result = json(
    await command("pnpm", [
      "dlx",
      "vercel@61.1.0",
      "deploy",
      "--prod",
      "--skip-domain",
      "--yes",
      "--json",
      "--token",
      required("VERCEL_TOKEN"),
      "--project",
      required("VERCEL_PROJECT"),
      ...projectArgs(),
      "--meta",
      `releaseSha=${sha}`,
      "--meta",
      `releaseBaseline=${baseline.deploymentId}`,
    ]),
    "Vercel deploy output",
  );
  const candidateId = result.id || result.deployment?.id;
  const candidateUrl = result.url || result.deployment?.url;
  if (!candidateId || !candidateUrl)
    fail("Vercel deploy output did not include candidate identity");
  const candidate = await deployment(candidateId);
  if (!candidate.id) fail("Staged deployment did not return an ID");
  validateCandidate(candidate, candidate.id, sha);
  const output = {
    candidateId: candidate.id,
    candidateUrl: `https://${candidateUrl.replace(/^https?:\/\//, "")}`,
    sha,
    baseline,
  };
  const outputPath = required("GITHUB_OUTPUT");
  const fs = await import("node:fs/promises");
  await fs.appendFile(
    outputPath,
    `candidate_id=${output.candidateId}\ncandidate_url=${output.candidateUrl}\nbaseline=${baseline.deploymentId}\nsha=${sha}\n`,
  );
  await fs.writeFile(
    required("RELEASE_STATE_FILE"),
    `${JSON.stringify(output, null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify(output)}\n`);
}

async function loadState() {
  return json(
    await (
      await import("node:fs/promises")
    ).readFile(required("RELEASE_STATE_FILE"), "utf8"),
    "release state",
  );
}

async function promote() {
  const state = await loadState();
  if (state.sha !== required("RELEASE_SHA")) fail("Release state SHA mismatch");
  assertBaseline(await currentAlias(), state.baseline);
  const candidate = await deployment(state.candidateId);
  validateCandidate(candidate, state.candidateId, state.sha);
  let promotionError;
  try {
    await command("pnpm", [
      "dlx",
      "vercel@61.1.0",
      "promote",
      state.candidateId,
      "--yes",
      "--token",
      required("VERCEL_TOKEN"),
      ...projectArgs(),
    ]);
  } catch (error) {
    promotionError = error;
  }
  const aliasNow = await currentAlias();
  if (aliasNow.deploymentId !== state.candidateId) {
    fail(
      promotionError
        ? `Promotion failed and production alias is unchanged or unknown: ${promotionError.message}`
        : "Promotion result is uncertain; production alias does not point to candidate",
    );
  }
}

async function rollbackIfCompatible() {
  const state = await loadState();
  if ((await currentAlias()).deploymentId !== state.candidateId)
    fail("Production alias changed; refusing rollback");
  const evidence = process.env.RELEASE_ROLLBACK_COMPATIBILITY;
  assertRollbackEvidence(evidence, state);
  let rollbackError;
  try {
    await command("pnpm", [
      "dlx",
      "vercel@61.1.0",
      "rollback",
      state.baseline.deploymentId,
      "--yes",
      "--token",
      required("VERCEL_TOKEN"),
      ...projectArgs(),
    ]);
  } catch (error) {
    rollbackError = error;
  }
  if ((await currentAlias()).deploymentId !== state.baseline.deploymentId)
    fail(
      rollbackError
        ? `Rollback failed and production alias is unchanged or unknown: ${rollbackError.message}`
        : "Rollback result is uncertain; production alias does not point to the recorded baseline",
    );
}

async function finalize() {
  const state = await loadState();
  if ((await currentAlias()).deploymentId !== state.candidateId)
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
  if (remote) assertTagSha(remoteTagTarget(remote, tag), state.sha, tag);
  else {
    await command("git", ["tag", tag, state.sha]);
    try {
      await command("git", ["push", "origin", `refs/tags/${tag}`]);
    } catch {
      remote = await lookupRemoteTag();
      assertTagSha(remoteTagTarget(remote, tag), state.sha, tag);
    }
  }
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

const actions = {
  authorize,
  "validate-version-pr": validateOpenVersionPr,
  stage,
  promote,
  "rollback-if-compatible": rollbackIfCompatible,
  finalize,
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
