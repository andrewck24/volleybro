import { execFile as execFileCallback } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";

export const execFile = promisify(execFileCallback);
const VERCEL_API = "https://api.vercel.com";
const SHA_PATTERN = /^[0-9a-f]{40}$/;
export const RELEASE_STATE_VERSION = 4;
export const PRODUCTION_WORKFLOW = ".github/workflows/production-release.yml";
export const CI_WORKFLOW = ".github/workflows/ci.yml";
export const REVIEW_ENVIRONMENT = "production-release-review";
export const RECOVERY_RECEIPT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const RECOVERY_COMPATIBILITY_TEST =
  "test/integration/persistence/release-compatibility.itest.ts";
export const AUTH_CONTRACT_PATTERNS = [
  /^src\/infrastructure\/services\/auth\//,
  /^src\/app\/api\/auth\//,
  /^src\/lib\/auth\.ts$/,
];
export const SMOKE_JOBS = ["Production smoke", "Classify production smoke"];
const COMPATIBILITY_TEST_JOB = "Run release compatibility suite";
export const ACCEPTANCE_JOBS = {
  human: "Accept production QA",
  smoke: "Accept production smoke",
};
const PERSISTED_CONTRACT_PATTERNS = [
  ...AUTH_CONTRACT_PATTERNS,
  /^src\/infrastructure\/db\//,
  /^src\/applications\/(?:usecases|repositories)\//,
  /^src\/app\/api\//,
  /^src\/entities\//,
  /^src\/interface\//,
  /^(?:pnpm-lock\.yaml|pnpm-workspace\.yaml|\.npmrc)$/,
];
const APP_SOURCE_PATTERN = /^src\//;
const KNOWN_UNRELATED_PATTERNS = [
  /^\.changeset\//,
  /^\.nvmrc$/,
  /^\.github\//,
  /^blueprint\//,
  /^docs\//,
  /^scripts\//,
  /^test\//,
  /^public\//,
  /^src\/.*(?:__tests__|\.(?:test|spec)\.)/,
  /^src\/(?:components|stories|styles)\//,
  /^CHANGELOG\.md$/,
  /^(?:README|CONTRIBUTING|CODING_STANDARDS|WORKFLOW|LICENSE)(?:\.|$)/,
  /^(?:eslint|jest|next|playwright|postcss|prettier|tailwind|tsconfig)[^.]*\.config\./,
  /^\.?(?:editorconfig|gitignore|prettierignore)$/,
  /^\.(?:agents|claude|storybook|husky|impeccable)\//,
  /^(?:AGENTS|CLAUDE|DESIGN|GLOSSARY|PRODUCT)\.md$/,
  /^README\.zh-TW\.md$/,
  /^skills-lock\.json$/,
  /^commitlint(?:\.[a-z]+)?\.config\./,
  /^knip\.json$/,
  /^\.(?:worktreeinclude|markdownlint[^/]*|diagram-design)$/,
];
const UNRELATED_MANIFEST_KEYS = {
  "package.json": ["version", "devDependencies", "scripts", "packageManager"],
  "vercel.json": ["git"],
};
export const SOURCE_QA_SCOPES = [
  ["unit", "Test"],
  ["integration", "Integration"],
];

export function fail(message) {
  throw new Error(message);
}

export function required(name) {
  const value = process.env[name];
  if (!value) fail(`Missing required environment value: ${name}`);
  return value;
}

export async function command(bin, args, { trim = true, ...options } = {}) {
  try {
    const result = await execFile(bin, args, {
      maxBuffer: 8 * 1024 * 1024,
      ...options,
    });
    return trim ? result.stdout.trim() : result.stdout;
  } catch (error) {
    fail(`${bin} ${args[0]} failed: ${error.stderr?.trim() || error.message}`);
  }
}

export async function vercel(path, options = {}) {
  const team = process.env.VERCEL_TEAM_ID;
  const url = new URL(`${VERCEL_API}${path}`);
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

export async function moveProduction(endpoint, expected, previous) {
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
      return actual;
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

export async function github(path) {
  const repository = required("GITHUB_REPOSITORY");
  return JSON.parse(
    await command("gh", ["api", `repos/${repository}/${path}`]),
  );
}

export async function shaAt(ref, path) {
  return command("git", ["show", `${ref}:${path}`], { trim: false });
}

export function json(value, label) {
  try {
    return JSON.parse(value);
  } catch {
    fail(`Invalid JSON in ${label}`);
  }
}

export function exactSha(value, label) {
  const sha = String(value || "").toLowerCase();
  if (!SHA_PATTERN.test(sha)) fail(`${label} must be a full 40-character SHA`);
  return sha;
}

export function positiveInteger(value, label) {
  const result = String(value || "");
  if (!/^[1-9]\d*$/.test(result)) fail(`${label} must be a positive integer`);
  return result;
}

function workflowFile(run) {
  return String(run?.path || "").split("@")[0];
}

export function hostname(value, label) {
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

function validateStateSchema(state) {
  if (state.stateVersion !== RELEASE_STATE_VERSION)
    fail("Release state does not use the current QA receipt contract");
  exactSha(state.sha, "Release state SHA");
  exactSha(state.controllerSha, "Release state controller SHA");
  positiveInteger(state.releaseRunId, "Release state run ID");
  positiveInteger(state.releaseRunAttempt, "Release state run attempt");
  if (!state.candidateId || !state.baseline?.deploymentId)
    fail("Release state is missing deployment identity");
  if (!state.projectId || !state.productionAlias)
    fail("Release state is missing its platform binding");
  if (!["normal", "normal-retry", "hotfix"].includes(state.releaseMode))
    fail("Release state has no trusted release mode");
}

export function validateConfiguredPlatform(state) {
  validateStateSchema(state);
  if (
    state.projectId !== required("VERCEL_PROJECT_ID") ||
    state.productionAlias !==
      hostname(required("PRODUCTION_ALIAS"), "Production alias")
  )
    fail("Release state platform binding does not match current configuration");
}

export function validateWorkflowRun(
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

export async function workflowRun(id) {
  return github(`actions/runs/${positiveInteger(id, "Workflow run ID")}`);
}

export async function workflowJobs(id) {
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

export function uniqueCompletedJob(jobs, name, attempt) {
  const matches = jobs.filter(
    (job) =>
      job.name === name &&
      (!job.run_attempt || String(job.run_attempt) === String(attempt)),
  );
  return matches.length === 1 && matches[0].status === "completed"
    ? matches[0]
    : undefined;
}

export function successfulJob(jobs, name, attempt) {
  const job = uniqueCompletedJob(jobs, name, attempt);
  if (job?.conclusion !== "success")
    fail(`${name} is not a unique successful native workflow job`);
  return job;
}

export function jobEvidence(job) {
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

export async function nativeApprovalHistory(runId, environment) {
  return approvedHistory(
    await github(
      `actions/runs/${positiveInteger(runId, "Workflow run ID")}/approvals`,
    ),
    environment,
  );
}

export function protectedJobKey(name) {
  const key = {
    [ACCEPTANCE_JOBS.human]: "production-acceptance",
  }[name];
  if (!key) fail(`Unknown protected workflow job: ${name}`);
  return key;
}

export function deploymentSourceSha(value, label) {
  const candidates = [value.meta?.releaseSha, value.meta?.githubCommitSha]
    .filter(Boolean)
    .map((sha) => exactSha(sha, `${label} source SHA`));
  if (!candidates.length || new Set(candidates).size !== 1)
    fail(`${label} has no single trustworthy source SHA`);
  return candidates[0];
}

export async function stagingDomains() {
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

export function validateCandidate(candidate, id, sha, domains) {
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

export function assertBaseline(actual, expected) {
  if (
    actual.deploymentId !== expected.deploymentId ||
    actual.updatedAt !== expected.updatedAt ||
    actual.sha !== expected.sha
  )
    fail("Production baseline changed while candidate was being reviewed");
}

export async function changedSourcePaths(state) {
  return (
    await command("git", [
      "diff",
      "--name-only",
      "--no-renames",
      `${exactSha(state.baseline.sha, "Production baseline SHA")}..${exactSha(state.sha, "Release source SHA")}`,
    ])
  )
    .split("\n")
    .filter(Boolean)
    .sort();
}

export async function persistedContractChanges(state) {
  const changedPaths = await changedSourcePaths(state);
  const contractPaths = changedPaths.filter(
    (file) =>
      PERSISTED_CONTRACT_PATTERNS.some((pattern) => pattern.test(file)) ||
      (APP_SOURCE_PATTERN.test(file) &&
        !KNOWN_UNRELATED_PATTERNS.some((pattern) => pattern.test(file))),
  );
  const manifestClass = {};
  for (const file of Object.keys(UNRELATED_MANIFEST_KEYS)) {
    if (!changedPaths.includes(file)) continue;
    try {
      const [baseline, candidate] = await Promise.all(
        [state.baseline.sha, state.sha].map(async (sha) =>
          JSON.parse(await command("git", ["show", `${sha}:${file}`])),
        ),
      );
      const keys = new Set([
        ...Object.keys(baseline),
        ...Object.keys(candidate),
      ]);
      let hasDependencyChange = false;
      let hasUnknownChange = false;
      for (const key of keys) {
        if (
          JSON.stringify(baseline[key]) === JSON.stringify(candidate[key]) ||
          UNRELATED_MANIFEST_KEYS[file].includes(key)
        )
          continue;
        if (
          file === "package.json" &&
          [
            "dependencies",
            "optionalDependencies",
            "peerDependencies",
            "pnpm",
          ].includes(key)
        )
          hasDependencyChange = true;
        else hasUnknownChange = true;
      }
      manifestClass[file] = hasUnknownChange
        ? "unclassified"
        : hasDependencyChange
          ? "contract"
          : "unrelated";
    } catch {
      manifestClass[file] = "unclassified";
    }
  }
  if (manifestClass["package.json"] === "contract")
    contractPaths.push("package.json");
  const unclassifiedPaths = changedPaths.filter(
    (file) =>
      !(file in manifestClass && manifestClass[file] !== "unclassified") &&
      !contractPaths.includes(file) &&
      !KNOWN_UNRELATED_PATTERNS.some((pattern) => pattern.test(file)),
  );
  return { changedPaths, contractPaths, unclassifiedPaths };
}

async function sourcePathExists(sha, sourcePath) {
  const listing = await command("git", [
    "ls-tree",
    "--full-tree",
    "--name-only",
    sha,
    "--",
    sourcePath,
  ]);
  return listing !== "";
}

export async function recoveryCompatibilityPlan(state) {
  const { changedPaths, contractPaths, unclassifiedPaths } =
    await persistedContractChanges(state);
  if (unclassifiedPaths.length > 0)
    fail(
      `Cannot classify changed paths for production-data compatibility: ${unclassifiedPaths.join(", ")}`,
    );
  const isForwardOnly =
    contractPaths.length > 0 &&
    !(await sourcePathExists(state.sha, RECOVERY_COMPATIBILITY_TEST));
  const isCompatibilityRequired = contractPaths.length > 0 && !isForwardOnly;
  if (isCompatibilityRequired) {
    const sourceTree = await command("git", [
      "rev-parse",
      `${exactSha(state.sha, "Release source SHA")}^{tree}`,
    ]);
    if (sourceTree !== state.sourceQA?.scopes?.integration?.testedTree)
      fail(
        "Compatibility test source tree does not match trusted integration CI",
      );
  }
  return {
    changedPaths,
    contractPaths,
    unclassifiedPaths,
    required: isCompatibilityRequired,
    forwardOnly: isForwardOnly,
  };
}

export async function nativeCompatibilityJob(state) {
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
  const job = successfulJob(
    jobs,
    COMPATIBILITY_TEST_JOB,
    state.releaseRunAttempt,
  );
  const steps = (job.steps || []).filter(
    (step) => step.name === "Run exact-baseline compatibility suite",
  );
  if (steps.length !== 1 || steps[0].conclusion !== "success")
    fail("Exact-baseline compatibility suite and report did not pass natively");
  return { run, job };
}

async function verifyCompatibilityTestStep(state, receipt) {
  if (
    !receipt ||
    receipt.runId !== String(state.releaseRunId) ||
    receipt.runAttempt !== String(state.releaseRunAttempt) ||
    receipt.baselineSha !== state.baseline.sha ||
    receipt.sourceSha !== state.sha ||
    receipt.sourceTree !== state.sourceQA?.scopes?.integration?.testedTree ||
    receipt.path !== RECOVERY_COMPATIBILITY_TEST ||
    receipt.result !== "success"
  )
    fail("Exact-baseline compatibility test receipt is missing or mismatched");
  const { job } = await nativeCompatibilityJob(state);
  if (String(job.id) !== receipt.jobId)
    fail("Exact-baseline compatibility suite and report did not pass natively");
  return receipt;
}

export async function recoveryReceiptFacts(state) {
  const {
    contractPaths,
    unclassifiedPaths,
    required: isCompatibilityRequired,
    forwardOnly: isForwardOnly,
  } = await recoveryCompatibilityPlan(state);
  const integration = state.sourceQA?.scopes?.integration;
  if (
    !integration ||
    integration.testedTree !== state.sourceQA.scopes.unit?.testedTree
  )
    fail(
      "Recovery proof requires unit and integration receipts for one source tree",
    );

  const policy = isForwardOnly
    ? "production-forward-only"
    : contractPaths.length === 0
      ? "production-contract-unchanged"
      : "production-targeted-integration-proof";
  let compatibilityTest;
  if (isCompatibilityRequired) {
    compatibilityTest = await verifyCompatibilityTestStep(
      state,
      state.compatibilityTest,
    );
  }

  const scope = (evidence) => ({
    scope: evidence.scope,
    sourceSha: evidence.sourceSha,
    testedSha: evidence.testedSha,
    testedTree: evidence.testedTree,
    producerSha: evidence.producerSha,
    producerRunId: evidence.producerRunId,
    producerRunAttempt: evidence.producerRunAttempt,
    workflowId: evidence.workflowId,
    workflowPath: evidence.workflowPath,
    workflowBlob: evidence.workflowBlob,
    job: {
      id: evidence.job?.id,
      name: evidence.job?.name,
      conclusion: evidence.job?.conclusion,
    },
  });
  return {
    repository: required("GITHUB_REPOSITORY"),
    release: {
      runId: String(state.releaseRunId),
      runAttempt: String(state.releaseRunAttempt),
      controllerSha: state.controllerSha,
      mode: state.releaseMode,
      sourceSha: state.sha,
      sourceTree: integration.testedTree,
    },
    baseline: state.baseline,
    candidate: {
      deploymentId: state.candidateId,
      sourceSha: state.sha,
      projectId: state.projectId,
    },
    database: {
      productionActive: true,
      policy,
      changedContractPaths: contractPaths,
      unclassifiedPaths,
      compatibilityTest,
      integration: scope(integration),
      rollbackAllowed: !isForwardOnly,
    },
    ci: {
      unit: scope(state.sourceQA.scopes.unit),
      integration: scope(integration),
    },
  };
}

export async function verifyRecoveryEvidence(
  state,
  expectedRunId = state.releaseRunId,
  { ignoreExpiry = false } = {},
) {
  assertSourceQAReceipt(state, expectedRunId);
  const receipt = state.recoveryEvidence;
  if (
    !receipt ||
    receipt.schemaVersion !== 2 ||
    receipt.runId !== String(expectedRunId) ||
    !Number.isFinite(Date.parse(receipt.issuedAt)) ||
    !Number.isFinite(Date.parse(receipt.expiresAt)) ||
    Date.parse(receipt.issuedAt) > Date.now() + 5 * 60 * 1000 ||
    Date.parse(receipt.expiresAt) - Date.parse(receipt.issuedAt) >
      RECOVERY_RECEIPT_TTL_MS
  )
    fail(
      "Recovery receipt is missing, malformed, or bound to another release run",
    );
  if (!ignoreExpiry && Date.parse(receipt.expiresAt) <= Date.now())
    fail("Recovery receipt expired");
  const facts = await recoveryReceiptFacts(state);
  if (JSON.stringify(receipt.facts) !== JSON.stringify(facts))
    fail(
      "Recovery receipt no longer matches the trusted source, baseline, candidate, or data contract",
    );
  await verifySourceQAScopes(state);
  return receipt;
}

export async function verifySourceQAScopes(state) {
  for (const [scope, name] of SOURCE_QA_SCOPES) {
    await verifyReusableSourceQA(state, state.sourceQA.scopes[scope], name);
  }
}

export function assertTagSha(actual, expected, tag) {
  if (actual && actual !== expected)
    fail(`${tag} already points at a different commit`);
}

export function assertExistingTagSha(actual, expected, tag) {
  if (!actual) fail(`Could not verify remote target for ${tag}`);
  assertTagSha(actual, expected, tag);
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

export async function isAncestor(base, head) {
  try {
    await execFile("git", ["merge-base", "--is-ancestor", base, head]);
    return true;
  } catch (error) {
    if (error.code === 1) return false;
    fail(`git merge-base failed: ${error.stderr?.trim() || error.message}`);
  }
}

export async function assertAncestor(base, head, message) {
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

export async function pendingChangesetsAt(ref) {
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

export async function verifyHotfixMetadata(base, repair) {
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

export function releaseOwnerContext() {
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

export function validateReleaseAuthorization(authorization, sha) {
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

export async function deployment(id) {
  return vercel(`/v13/deployments/${encodeURIComponent(id)}`);
}

export async function currentAlias() {
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

export async function writeState(file, state) {
  await fs.writeFile(file, `${JSON.stringify(state, null, 2)}\n`);
}

export async function appendOutputs(values) {
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  if (lines.some((line) => /[\r\n]/.test(line)))
    fail("GitHub output contains an unexpected newline");
  await fs.appendFile(required("GITHUB_OUTPUT"), `${lines.join("\n")}\n`);
}

async function workflowBlob(ref) {
  const response = await github(
    `contents/${CI_WORKFLOW}?ref=${encodeURIComponent(exactSha(ref, "Workflow ref"))}`,
  );
  if (response.path !== CI_WORKFLOW || !SHA_PATTERN.test(response.sha || ""))
    fail("CI workflow blob identity is invalid");
  return response.sha;
}

async function commitTree(sha) {
  const commit = await github(`git/commits/${exactSha(sha, "Tested commit")}`);
  if (commit.sha !== sha) fail("GitHub commit identity changed");
  return exactSha(commit.tree?.sha, "Tested tree");
}

export async function sourceScopeEvidence(
  state,
  run,
  jobs,
  workflow,
  scope,
  name,
) {
  const correction =
    run.event === "workflow_dispatch" && run.head_sha === state.controllerSha;
  if (
    !["pull_request", "workflow_dispatch"].includes(run.event) ||
    (!correction &&
      ![state.sha, state.reviewedSource?.reviewedSha].includes(run.head_sha))
  )
    fail("CI run is not associated with the authorized source");
  if (
    correction &&
    (run.head_branch !== "main" ||
      run.actor?.login !== required("RELEASE_OWNER_LOGIN") ||
      run.triggering_actor?.login !== required("RELEASE_OWNER_LOGIN"))
  )
    fail("CI correction must be owner-dispatched from trusted main");
  const job = successfulJob(jobs, name, run.run_attempt);
  const markers = (job.steps || []).filter((step) =>
    /^Source tree /.test(step.name),
  );
  const marker = markers[0];
  const identity = marker?.name.match(
    /^Source tree ([0-9a-f]{40}) at ([0-9a-f]{40})$/,
  );
  if (
    markers.length !== 1 ||
    !identity ||
    marker.status !== "completed" ||
    marker.conclusion !== "success"
  )
    fail("CI scope has no successful native tested-tree receipt");
  const [, tree, testedSha] = identity;
  const producers = (job.steps || []).filter((step) =>
    /^Producer workflow /.test(step.name),
  );
  const producer = producers[0];
  const producerSha = producer?.name.match(
    /^Producer workflow ([0-9a-f]{40})$/,
  )?.[1];
  if (
    producers.length !== 1 ||
    !producerSha ||
    producer.status !== "completed" ||
    producer.conclusion !== "success" ||
    (correction &&
      (producerSha !== state.controllerSha || testedSha !== state.sha)) ||
    (!correction && producerSha !== testedSha)
  )
    fail("CI scope has no trusted native producer identity");
  const [testedTree, sourceTree, testedBlob, controllerBlob] =
    await Promise.all([
      commitTree(testedSha),
      commitTree(state.sha),
      workflowBlob(producerSha),
      workflowBlob(state.controllerSha),
    ]);
  if (
    tree !== testedTree ||
    tree !== sourceTree ||
    testedBlob !== controllerBlob
  )
    fail("CI scope content or producer workflow is not trusted");
  return {
    kind: "ci-reuse",
    scope,
    sourceSha: state.sha,
    testedSha,
    testedTree: tree,
    producerSha,
    producerRunId: String(run.id),
    producerRunAttempt: String(run.run_attempt),
    workflowId: String(workflow.id),
    workflowPath: CI_WORKFLOW,
    workflowBlob: testedBlob,
    job: jobEvidence(job),
  };
}

export async function verifyReusableSourceQA(state, receipt, expectedName) {
  const repository = required("GITHUB_REPOSITORY");
  const [workflow, run, jobs] = await Promise.all([
    github("actions/workflows/ci.yml"),
    workflowRun(receipt.producerRunId),
    workflowJobs(receipt.producerRunId),
  ]);
  validateWorkflowRun(run, {
    id: receipt.producerRunId,
    path: CI_WORKFLOW,
    repository,
    attempt: receipt.producerRunAttempt,
  });
  if (
    run.status !== "completed" ||
    String(run.workflow_id) !== receipt.workflowId ||
    workflow.path !== CI_WORKFLOW ||
    String(workflow.id) !== receipt.workflowId
  )
    fail("Reusable source QA producer is no longer trusted");
  const actual = await sourceScopeEvidence(
    state,
    run,
    jobs,
    workflow,
    receipt.scope,
    expectedName,
  );
  if (JSON.stringify(actual) !== JSON.stringify(receipt))
    fail("Reusable source QA native job receipt changed");
}

export function assertSourceQAReceipt(
  state,
  expectedRunId = state.releaseRunId,
) {
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
        evidence.kind === "ci-reuse" &&
        evidence.job?.id &&
        evidence.job?.name &&
        evidence.job?.conclusion === "success"
      );
    })
  )
    fail("No exact-source QA receipt is bound to this release run");
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

export async function loadState({ allowRecovery = false } = {}) {
  const state = json(
    await fs.readFile(required("RELEASE_STATE_FILE"), "utf8"),
    "release state",
  );
  if (state.recovery) {
    if (!allowRecovery) fail("Recovery state is not valid for this action");
    validateRecoveryMarker(state);
    if (state.stateVersion !== RELEASE_STATE_VERSION)
      fail("Legacy release artifacts require a fresh authorized release run");
    validateStateSchema(state);
  } else if (state.stateVersion === RELEASE_STATE_VERSION) {
    validateStateSchema(state);
    if (
      state.releaseRunId !== required("GITHUB_RUN_ID") ||
      state.releaseRunAttempt !== (process.env.GITHUB_RUN_ATTEMPT || "1")
    )
      fail("Release state belongs to a different workflow run or attempt");
  } else {
    fail("Legacy release artifacts require a fresh authorized release run");
  }
  if (
    !state.recovery &&
    (state.authorization ||
      process.env.GITHUB_EVENT_NAME === "workflow_dispatch")
  )
    validateReleaseAuthorization(state.authorization, state.sha);
  return state;
}

export function forwardOnlyNotice(facts) {
  return facts.database.rollbackAllowed
    ? ""
    : ` Forward-only: no rollback to ${facts.baseline.sha}`;
}
