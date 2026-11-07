import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  ACCEPTANCE_JOBS,
  PRODUCTION_WORKFLOW,
  REVIEW_ENVIRONMENT,
  SMOKE_JOBS,
  assertAncestor,
  assertExistingTagSha,
  assertTagSha,
  command,
  currentAlias,
  exactSha,
  execFile,
  fail,
  forwardOnlyNotice,
  isAncestor,
  json,
  loadState,
  nativeApprovalHistory,
  pendingChangesetsAt,
  protectedJobKey,
  remoteTagTarget,
  required,
  shaAt,
  successfulJob,
  uniqueCompletedJob,
  validateConfiguredPlatform,
  validateWorkflowRun,
  verifyHotfixMetadata,
  verifyRecoveryEvidence,
  workflowJobs,
  workflowRun,
} from "./core.js";

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

function assertSameFiles(actual, expected, label) {
  if (
    actual.size !== expected.size ||
    [...expected].some(([path, contents]) => actual.get(path) !== contents)
  ) {
    fail(`${label} changed during merge-back`);
  }
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

export async function finalize() {
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

function packageWithVersion(contents, current, next) {
  if (current === next) return contents;
  const pattern = /("version"\s*:\s*)"[^"]+"/g;
  if ([...contents.matchAll(pattern)].length !== 1)
    fail("Could not safely locate the package version");
  const updated = contents.replace(pattern, `$1"${next}"`);
  if (json(updated, "package.json").version !== next)
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

export async function prepareMergeBack() {
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
      `Deployed baseline: \`${baseline}\`. Prepared against main: \`${main}\`. Follow the hotfix synchronization procedure in docs/release-contract.md; recheck the deployed tag and latest main, preserve both histories and pending changesets, and do not rerun publication to resolve synchronization. Merge requires explicit authorization and latest required checks.`,
      "",
      "## 中文摘要",
      "",
      "優先交由 Agent 檢視、處理衝突與同步；保留 main 工作與 pending changesets，依 docs/release-contract.md 的 hotfix 同步流程驗證。取得明確合併授權且最新 checks 通過後，以 merge commit 合併；需要新決策或無法安全解決才交回開發者，不自動派工或 auto-merge。",
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
      `### Hotfix merge-back\n\nOpened ${url} for deployed SHA \`${repair}\`. Start an agent with this PR and the accepted release state; follow the hotfix synchronization procedure in docs/release-contract.md. No unattended dispatch or auto-merge; merging requires explicit authorization and latest required checks.`,
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
