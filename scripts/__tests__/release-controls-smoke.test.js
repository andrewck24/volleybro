import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  fixture,
  JOB,
  run,
  updateApi,
  workflowJob,
  prepareAcceptedRelease,
  prepareFinalRelease,
  outputsOf,
} from "../../test/support/release-controls-fixture.js";

const SMOKE_TESTS = [
  ["oauth", "@smoke oauth configuration"],
  ["chromium", "@smoke session is valid"],
  ["chromium", "@smoke test team read-only page"],
  ["webkit", "@smoke session is valid"],
  ["webkit", "@smoke test team read-only page"],
];

function smokeResults(statuses = {}) {
  return SMOKE_TESTS.map(([project, title]) => ({
    project,
    title,
    status: statuses[`${project} ${title}`] ?? "expected",
  }));
}

const SESSION = "@smoke session is valid";

const TEAM = "@smoke test team read-only page";

async function prepareSmokeRun(f, { alias = "dpl_cand", env = {} } = {}) {
  const { accepted } = await prepareAcceptedRelease(f);
  const api = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    alias,
    deployments: { dpl_base: { createdAt: 1000 } },
    envs: [
      { key: "BETTER_AUTH_SECRET", target: ["production"], updatedAt: 500 },
      { key: "MONGODB_URI", target: ["production"], updatedAt: 9000 },
    ],
    jobs: {
      ...api.jobs,
      9: [
        ...api.jobs[9],
        workflowJob(801, JOB.smoke),
        workflowJob(802, JOB.classify),
        workflowJob(504, JOB.qa, "completed", "skipped"),
        workflowJob(803, JOB.smokeAcceptance, "in_progress", null),
      ],
    },
  });
  return {
    RELEASE_STATE_FILE: accepted,
    SMOKE_RESULTS: JSON.stringify(smokeResults()),
    SMOKE_BEFORE_DEPLOYMENT_ID: "dpl_cand",
    SMOKE_BEFORE_SHA: f.merge,
    ...env,
  };
}

// The verdict classify hands to the accept job.
const ACCEPT_ENV = (f) => ({
  SMOKE_OUTCOME: "pass",
  SMOKE_AUTH: "unchanged",
  SMOKE_AUTO_ACCEPT: "true",
  SMOKE_AFTER_DEPLOYMENT_ID: "dpl_cand",
  SMOKE_AFTER_SHA: f.merge,
});

async function classify(f, env, overrides = {}) {
  await writeFile(f.env.GITHUB_OUTPUT, "");
  const result = run(f, "classify-smoke", { ...env, ...overrides });
  assert.equal(result.status, 0, result.stderr);
  return outputsOf(f);
}

test("summarize-smoke flattens nested Playwright suites into compact results", async (t) => {
  const f = await fixture(t);
  const report = path.join(f.root, "report.json");
  await writeFile(
    report,
    JSON.stringify({
      suites: [
        {
          title: "a.e2e.ts",
          specs: [
            {
              title: SESSION,
              tests: [{ projectName: "webkit", status: "flaky" }],
            },
          ],
          suites: [
            {
              title: "nested",
              specs: [
                {
                  title: TEAM,
                  tests: [{ projectName: "chromium", status: "skipped" }],
                },
              ],
            },
          ],
        },
      ],
    }),
  );
  await writeFile(f.env.GITHUB_OUTPUT, "");
  const result = run(f, "summarize-smoke", { SMOKE_REPORT_FILE: report });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse((await outputsOf(f)).smoke_results), [
    { project: "webkit", title: SESSION, status: "flaky" },
    { project: "chromium", title: TEAM, status: "skipped" },
  ]);
});

test("classify-smoke separates pass, infrastructure and regression and fails closed", async (t) => {
  const f = await fixture(t);
  const env = await prepareSmokeRun(f);
  const key = (project, title) => `${project} ${title}`;
  const cases = [
    ["pass", smokeResults()],
    ["pass", smokeResults({ [key("chromium", SESSION)]: "flaky" })],
    [
      "infrastructure",
      smokeResults({
        [key("chromium", SESSION)]: "unexpected",
        [key("chromium", TEAM)]: "skipped",
      }),
    ],
    [
      "infrastructure",
      smokeResults({
        [key("chromium", SESSION)]: "unexpected",
        [key("chromium", TEAM)]: "skipped",
        [key("webkit", SESSION)]: "unexpected",
        [key("webkit", TEAM)]: "skipped",
      }),
    ],
    [
      "regression",
      smokeResults({
        [key("oauth", "@smoke oauth configuration")]: "unexpected",
      }),
    ],
    ["regression", smokeResults({ [key("webkit", TEAM)]: "unexpected" })],
    [
      "regression",
      smokeResults({
        [key("chromium", SESSION)]: "unexpected",
        [key("chromium", TEAM)]: "unexpected",
      }),
    ],
    [
      "regression",
      smokeResults({
        [key("chromium", SESSION)]: "unexpected",
        [key("webkit", TEAM)]: "skipped",
      }),
    ],
    [
      "regression",
      smokeResults({ [key("oauth", "@smoke oauth configuration")]: "skipped" }),
    ],
    ["regression", smokeResults().slice(1)],
    ["infrastructure", []],
  ];
  for (const [outcome, results] of cases) {
    const outputs = await classify(f, env, {
      SMOKE_RESULTS: JSON.stringify(results),
    });
    assert.equal(outputs.outcome, outcome, JSON.stringify(results));
    assert.equal(outputs.auto_accept, String(outcome === "pass"));
  }
});

test("classify-smoke treats a before or after alias that is not the candidate as regression", async (t) => {
  const f = await fixture(t);
  const env = await prepareSmokeRun(f);
  for (const override of [
    { SMOKE_BEFORE_DEPLOYMENT_ID: "dpl_base" },
    { SMOKE_BEFORE_SHA: f.deployed },
  ]) {
    assert.equal((await classify(f, env, override)).outcome, "regression");
  }
  await updateApi(f, { alias: "dpl_base" });
  const outputs = await classify(f, env);
  assert.equal(outputs.outcome, "regression");
  assert.equal(outputs.auto_accept, "false");
});

test("classify-smoke judges auth from changed files, better-auth version, env and query failures", async (t) => {
  const unchanged = await fixture(t);
  const env = await prepareSmokeRun(unchanged);
  let outputs = await classify(unchanged, env);
  assert.deepEqual([outputs.auth, outputs.auto_accept], ["unchanged", "true"]);
  assert.deepEqual(
    [outputs.after_deployment_id, outputs.after_sha],
    ["dpl_cand", unchanged.merge],
  );

  await updateApi(unchanged, {
    envs: [{ key: "AUTH_GOOGLE_ID", target: ["production"], updatedAt: 2000 }],
  });
  outputs = await classify(unchanged, env);
  assert.deepEqual([outputs.auth, outputs.auto_accept], ["changed", "false"]);
  await updateApi(unchanged, {
    envs: [{ key: "AUTH_GOOGLE_ID", target: ["production"], updatedAt: 2000 }],
    envStatus: 500,
  });
  assert.equal((await classify(unchanged, env)).auth, "unknown");

  const file = await fixture(t, {
    persistedContract: true,
    persistedContractPath: "src/lib/auth.ts",
  });
  assert.equal(
    (await classify(file, await prepareSmokeRun(file))).auth,
    "changed",
  );

  const nonAuth = await fixture(t, { persistedContract: true });
  assert.equal(
    (await classify(nonAuth, await prepareSmokeRun(nonAuth))).auth,
    "unchanged",
  );

  const version = await fixture(t, { releaseAuthVersion: "1.8.0" });
  outputs = await classify(version, await prepareSmokeRun(version));
  assert.deepEqual([outputs.auth, outputs.auto_accept], ["changed", "false"]);
});

test("record-smoke-acceptance writes a smoke receipt only for a classified unchanged-auth pass on the candidate", async (t) => {
  const f = await fixture(t);
  const env = await prepareSmokeRun(f);
  const finalState = path.join(f.root, "smoke-final.json");
  const record = (overrides = {}) =>
    run(f, "record-smoke-acceptance", {
      ...env,
      ...ACCEPT_ENV(f),
      RELEASE_FINAL_STATE_FILE: finalState,
      GITHUB_JOB: "production-smoke-acceptance",
      ...overrides,
    });
  for (const override of [
    { SMOKE_OUTCOME: "infrastructure" },
    { SMOKE_OUTCOME: "regression" },
    { SMOKE_AUTH: "changed" },
    { SMOKE_AUTH: "unknown" },
    { SMOKE_AUTO_ACCEPT: "false" },
    { SMOKE_BEFORE_DEPLOYMENT_ID: "dpl_base" },
    { SMOKE_AFTER_DEPLOYMENT_ID: "dpl_base" },
    { SMOKE_AFTER_SHA: f.deployed },
  ])
    assert.notEqual(record(override).status, 0, JSON.stringify(override));
  const result = record();
  assert.equal(result.status, 0, result.stderr);
  const { productionQA } = JSON.parse(await readFile(finalState, "utf8"));
  assert.equal(productionQA.approval.kind, "smoke");
  assert.deepEqual(
    productionQA.approval.jobs.map(({ id, name }) => [id, name]),
    [
      ["801", JOB.smoke],
      ["802", JOB.classify],
    ],
  );
  assert.equal(productionQA.approval.after.deploymentId, "dpl_cand");
  assert.equal(productionQA.approval.after.sha, f.merge);
});

async function setJobs(f, patches) {
  const api = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    jobs: {
      ...api.jobs,
      9: api.jobs[9].map((job) => ({ ...job, ...(patches[job.name] || {}) })),
    },
  });
}

async function recordedSmoke(f) {
  const env = await prepareSmokeRun(f);
  const finalState = path.join(f.root, "smoke-final.json");
  const result = run(f, "record-smoke-acceptance", {
    ...env,
    ...ACCEPT_ENV(f),
    RELEASE_FINAL_STATE_FILE: finalState,
  });
  assert.equal(result.status, 0, result.stderr);
  await setJobs(f, {
    [JOB.smokeAcceptance]: { status: "completed", conclusion: "success" },
  });
  return finalState;
}

async function mutatedReceipt(f, file, mutate) {
  const state = JSON.parse(await readFile(file, "utf8"));
  mutate(state.productionQA);
  const out = path.join(f.root, `mutated-${Math.random()}.json`);
  await writeFile(out, JSON.stringify(state));
  return out;
}

test("finalize accepts a smoke receipt and rejects a receipt that does not match the run, jobs or alias", async (t) => {
  const f = await fixture(t);
  const finalState = await recordedSmoke(f);
  const finalizeWith = (file = finalState) =>
    run(f, "finalize", { RELEASE_STATE_FILE: file });
  const mutations = [
    (qa) => {
      qa.approval.jobs[0].id = 999;
    },
    (qa) => {
      qa.approval.jobs.pop();
    },
    (qa) => {
      qa.approval.after.sha = f.deployed;
    },
    (qa) => {
      qa.approval.before.deploymentId = "dpl_base";
    },
    (qa) => {
      qa.runId = "10";
    },
    (qa) => {
      delete qa.approval.kind;
    },
    (qa) => {
      qa.approval.kind = "other";
    },
    (qa) => {
      qa.approval.kind = "human";
    },
  ];
  for (const mutate of mutations) {
    const denied = finalizeWith(await mutatedReceipt(f, finalState, mutate));
    assert.notEqual(denied.status, 0, String(mutate));
  }
  await setJobs(f, { [JOB.classify]: { conclusion: "failure" } });
  assert.notEqual(finalizeWith().status, 0);
  await setJobs(f, { [JOB.classify]: { conclusion: "success" } });
  const result = finalizeWith();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.git(["rev-parse", "v1.0.1"]), f.merge);
});

test("finalize requires exactly one acceptance job to succeed and the other to be skipped", async (t) => {
  const smoke = await fixture(t);
  const smokeState = await recordedSmoke(smoke);
  for (const [qa, auto] of [
    ["success", "success"],
    ["skipped", "skipped"],
    ["failure", "success"],
  ]) {
    await setJobs(smoke, {
      [JOB.qa]: { conclusion: qa },
      [JOB.smokeAcceptance]: { conclusion: auto },
    });
    const denied = run(smoke, "finalize", { RELEASE_STATE_FILE: smokeState });
    assert.notEqual(denied.status, 0, `${qa}/${auto}`);
    assert.match(denied.stderr, /Exactly one of/);
  }

  const human = await fixture(t);
  const { finalState } = await prepareFinalRelease(human);
  for (const [qa, auto] of [
    ["success", "success"],
    ["skipped", "skipped"],
    ["skipped", "success"],
  ]) {
    await setJobs(human, {
      [JOB.qa]: { status: "completed", conclusion: qa },
      [JOB.smokeAcceptance]: { conclusion: auto },
    });
    assert.notEqual(
      run(human, "finalize", { RELEASE_STATE_FILE: finalState }).status,
      0,
      `${qa}/${auto}`,
    );
  }
  await setJobs(human, {
    [JOB.qa]: { conclusion: "success" },
    [JOB.smokeAcceptance]: { conclusion: "skipped" },
  });
  const accepted = run(human, "finalize", { RELEASE_STATE_FILE: finalState });
  assert.equal(accepted.status, 0, accepted.stderr);
});
