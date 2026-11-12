import { readFile } from "node:fs/promises";
import {
  ACCEPTANCE_JOBS,
  AUTH_CONTRACT_PATTERNS,
  PRODUCTION_WORKFLOW,
  REVIEW_ENVIRONMENT,
  SMOKE_JOBS,
  appendOutputs,
  assertBaseline,
  changedSourcePaths,
  currentAlias,
  deployment,
  fail,
  jobEvidence,
  json,
  loadState,
  moveProduction,
  nativeApprovalHistory,
  positiveInteger,
  protectedJobKey,
  required,
  shaAt,
  stagingDomains,
  successfulJob,
  validateCandidate,
  validateConfiguredPlatform,
  validateWorkflowRun,
  vercel,
  verifyRecoveryEvidence,
  workflowJobs,
  workflowRun,
  writeState,
} from "./core.js";

const AUTH_ENV_PATTERN = /^(?:BETTER_AUTH|AUTH_GOOGLE)_/;
const SMOKE_SESSION = "@smoke session is valid";
const SMOKE_TEAM = "@smoke test team read-only page";
const SMOKE_EXPECTED = [
  ["oauth", "@smoke oauth configuration"],
  ...["chromium", "webkit"].flatMap((project) =>
    [SMOKE_SESSION, SMOKE_TEAM].map((title) => [project, title]),
  ),
];

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

export async function promote() {
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

function smokeOutcome(results) {
  if (!Array.isArray(results)) return "regression";
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

export async function summarizeSmoke() {
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

export async function classifySmoke() {
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

export async function recordSmokeAcceptance() {
  const state = await loadState();
  validateConfiguredPlatform(state);
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

export async function recordProductionQA() {
  const state = await loadState();
  validateConfiguredPlatform(state);
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
