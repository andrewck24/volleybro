import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CI_WORKFLOW,
  RELEASE_STATE_VERSION,
  SOURCE_QA_SCOPES,
  appendOutputs,
  assertAncestor,
  assertBaseline,
  assertSourceQAReceipt,
  command,
  currentAlias,
  deployment,
  exactSha,
  fail,
  github,
  hostname,
  json,
  loadState,
  persistedContractChanges,
  positiveInteger,
  recoveryCompatibilityPlan,
  required,
  sourceScopeEvidence,
  stagingDomains,
  validateCandidate,
  validateConfiguredPlatform,
  validateReleaseAuthorization,
  validateWorkflowRun,
  workflowJobs,
  writeState,
} from "./core.js";

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

// The Vercel CLI bundles and runs a root vercel.{ts,mts,js,mjs,cjs} and loads
// root .env files before it authenticates, with the deploy token in its environment.
const CLI_LOADED_FILE = /^(vercel\.(ts|mts|js|mjs|cjs)|\.env.*)$/;

async function assertNoCliLoadedFiles(root) {
  const loaded = (await fs.readdir(root))
    .filter((name) => CLI_LOADED_FILE.test(name) && name !== ".env.example")
    .sort();
  if (loaded.length > 0)
    fail(
      `Release candidate contains files the Vercel CLI would run or load with the deploy token: ${loaded.join(", ")}`,
    );
}

export async function stage() {
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
  await assertNoCliLoadedFiles(process.cwd());
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
        "--cwd",
        process.cwd(),
        "--token",
        required("VERCEL_TOKEN"),
        "--meta",
        `releaseSha=${sha}`,
        "--meta",
        `releaseBaseline=${baseline.deploymentId}`,
      ],
      {
        // pnpm reads .npmrc from its working directory, and the checkout holds the candidate's.
        cwd: path.dirname(fileURLToPath(import.meta.url)),
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

export async function recordSourceQA() {
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

// Run on pull requests, so a path the release classifier cannot place fails the
// PR that adds it instead of stopping a later release before promotion.
export async function checkPathClassification() {
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
        "Add a pattern to KNOWN_UNRELATED_PATTERNS or PERSISTED_CONTRACT_PATTERNS in scripts/release-controls/core.js.",
    );
}

export async function planRecoveryCompatibility() {
  const state = await loadState();
  validateConfiguredPlatform(state);
  const plan = await recoveryCompatibilityPlan(state);
  await appendOutputs({ required: String(plan.required) });
}
