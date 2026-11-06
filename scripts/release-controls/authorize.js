import fs from "node:fs/promises";
import {
  assertAncestor,
  assertExistingTagSha,
  command,
  currentAlias,
  exactSha,
  fail,
  github,
  json,
  releaseOwnerContext,
  remoteTagTarget,
  required,
  shaAt,
  verifyHotfixMetadata,
} from "./core.js";

const PUSH_LOOKUP_ATTEMPTS = 12;
const PUSH_LOOKUP_DELAY_MS = 5_000;

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

function validateReviewEnvironment(environment) {
  if (
    !environment.protection_rules?.some(
      (rule) => rule.type === "required_reviewers" && rule.reviewers?.length,
    )
  ) {
    fail("Production candidate QA environment has no required reviewers");
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
  // Stage maps the reviewed PR head through the merge's second parent, and
  // only a merge commit keeps the PR head as an ancestor for a retry.
  const [, parent, ...rest] = (
    await command("git", ["rev-list", "--parents", "-n", "1", sha])
  ).split(" ");
  if (rest.length !== 1)
    fail(
      "Version PR must land as a merge commit; a squash or rebase landing cannot be released. Open a new version PR and merge it with a merge commit",
    );
  if (rest[0] !== pr.head.sha)
    fail(
      `Version PR head ${pr.head.sha} is not the merge's second parent; open a new version PR`,
    );
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

export async function authorize() {
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
  await validateMergedVersionPr(pr.number, sha);
  await fs.appendFile(required("GITHUB_OUTPUT"), `release=true\nsha=${sha}\n`);
  process.stdout.write(
    `${JSON.stringify({ sha, version: json(await shaAt(sha, "package.json"), "package.json").version })}\n`,
  );
}

export async function authorizeRetry() {
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

export async function authorizeHotfix() {
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

export async function validateOpenVersionPr() {
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
