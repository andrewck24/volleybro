import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  fixture,
  run,
  updateApi,
  workflowJob,
  prepareSourceRelease,
  prepareAcceptedRelease,
} from "./release-controls-support.js";

const compatibilityStep = (conclusion = "success", status = "completed") => ({
  name: "Run exact-baseline compatibility suite",
  status,
  conclusion,
});

async function setCompatibilityJobs(f, jobs) {
  const api = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, { jobs: { ...api.jobs, 9: jobs } });
}

const passingCompatibilityJob = (id = 503, status = "completed") =>
  workflowJob(id, "Run release compatibility suite", status, "success", [
    compatibilityStep(),
  ]);

function compatibilityReport(f, titles, skipped = 0, statuses = []) {
  return {
    numFailedTests: 0,
    numPendingTests: skipped,
    numTodoTests: 0,
    numPassedTests: titles.length - skipped,
    numTotalTests: titles.length,
    testResults: [
      {
        name: path.join(
          f.repo,
          "test/integration/persistence/release-compatibility.itest.ts",
        ),
        status: "passed",
        assertionResults: titles.map((title, index) => ({
          title,
          status: statuses[index] ?? (index < skipped ? "skipped" : "passed"),
        })),
      },
    ],
  };
}

const compatibilityAssertions = (f) => [
  "candidate reads legacy persisted records",
  `production baseline ${f.deployed} reads candidate-written records`,
];

async function passingCompatibilityTestJob(f) {
  await setCompatibilityJobs(f, [passingCompatibilityJob()]);
  f.env.RELEASE_COMPATIBILITY_REPORT = path.join(f.root, "report.json");
  await writeFile(
    f.env.RELEASE_COMPATIBILITY_REPORT,
    JSON.stringify(compatibilityReport(f, compatibilityAssertions(f))),
  );
}

test("persisted contract changes without a compatibility suite promote as forward-only and refuse rollback", async (t) => {
  const f = await fixture(t, { persistedContract: true });
  const { accepted } = await prepareAcceptedRelease(f);
  const state = JSON.parse(await readFile(accepted, "utf8"));
  assert.equal(
    state.recoveryEvidence.facts.database.policy,
    "production-forward-only",
  );
  assert.equal(state.recoveryEvidence.facts.database.rollbackAllowed, false);
  assert.equal(
    state.recoveryEvidence.facts.database.compatibilityTest,
    undefined,
  );
  await updateApi(f, { alias: "dpl_cand" });
  const callsBefore = JSON.parse(await readFile(f.statePath, "utf8")).calls;
  const denied = run(f, "rollback-if-compatible", {
    RELEASE_STATE_FILE: accepted,
  });
  assert.notEqual(denied.status, 0);
  assert.match(denied.stderr, /forward-only release/);
  const after = JSON.parse(await readFile(f.statePath, "utf8"));
  assert.equal(after.alias, "dpl_cand");
  assert.deepEqual(after.calls, callsBefore);
});

test("persisted contract changes require exact-source integration proof", async (t) => {
  const f = await fixture(t, { persistedContract: true });
  const { env: sourceEnv } = await prepareSourceRelease(f);
  const accepted = path.join(f.root, "missing-proof.json");
  const missing = run(f, "record-recovery-evidence", {
    ...sourceEnv,
    RELEASE_ACCEPTED_STATE_FILE: accepted,
  });
  assert.equal(missing.status, 0, missing.stderr);
  assert.match(missing.stdout, /Forward-only: no rollback to /);

  const proofFixture = await fixture(t, {
    persistedContract: true,
    persistedContractPath: "src/entities/game.ts",
    compatibilityTest: true,
  });
  await passingCompatibilityTestJob(proofFixture);
  const proofRelease = await prepareAcceptedRelease(proofFixture);
  const proof = JSON.parse(await readFile(proofRelease.accepted, "utf8"));
  assert.equal(
    proof.recoveryEvidence.facts.database.policy,
    "production-targeted-integration-proof",
  );
  assert.equal(
    proof.recoveryEvidence.facts.database.compatibilityTest.path,
    "test/integration/persistence/release-compatibility.itest.ts",
  );
  assert.deepEqual(proof.recoveryEvidence.facts.database.changedContractPaths, [
    "src/entities/game.ts",
  ]);
  assert.equal(
    proof.recoveryEvidence.facts.database.compatibilityTest.baselineSha,
    proofFixture.deployed,
  );
  assert.equal(
    proof.recoveryEvidence.facts.database.compatibilityTest.sourceSha,
    proofFixture.merge,
  );
  assert.equal(proof.recoveryEvidence.facts.database.rollbackAllowed, true);
  assert.equal(proof.compatibilityTest.jobId, "503");
});

test("unclassified production source paths stop instead of implying compatibility", async (t) => {
  const f = await fixture(t, {
    persistedContract: true,
    persistedContractPath: "middleware.ts",
  });
  const source = await prepareSourceRelease(f);
  const result = run(f, "record-recovery-evidence", {
    ...source.env,
    RELEASE_ACCEPTED_STATE_FILE: path.join(f.root, "unclassified.json"),
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Cannot classify changed paths/);
  assert.match(result.stderr, /middleware\.ts/);
});

test("persisted application writers and dependency-lock changes without a suite are forward-only", async (t) => {
  for (const persistedContractPath of [
    "src/applications/usecases/game/update-set.usecase.ts",
    "pnpm-lock.yaml",
  ]) {
    const f = await fixture(t, {
      persistedContract: true,
      persistedContractPath,
    });
    const source = await prepareSourceRelease(f);
    const result = run(f, "record-recovery-evidence", {
      ...source.env,
      RELEASE_ACCEPTED_STATE_FILE: path.join(f.root, "missing-suite.json"),
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /production-forward-only/);
  }
});

test("production package version metadata alone is not a persisted contract change", async (t) => {
  const f = await fixture(t);
  const { accepted } = await prepareAcceptedRelease(f);
  const state = JSON.parse(await readFile(accepted, "utf8"));
  assert.equal(
    state.recoveryEvidence.facts.database.policy,
    "production-contract-unchanged",
  );
  assert.equal(state.recoveryEvidence.facts.database.rollbackAllowed, true);
});

test("compatibility report requires both directional assertions to pass without skips", async (t) => {
  const f = await fixture(t, {
    persistedContract: true,
    compatibilityTest: true,
  });
  await passingCompatibilityTestJob(f);
  const source = await prepareSourceRelease(f);
  const accepted = path.join(f.root, "report-proof.json");
  const record = () =>
    run(f, "record-recovery-evidence", {
      ...source.env,
      RELEASE_ACCEPTED_STATE_FILE: accepted,
    });
  const expected = compatibilityAssertions(f);
  const wrongSha = `${f.deployed.slice(0, -1)}${f.deployed.endsWith("0") ? "1" : "0"}`;
  const invalidReports = [
    compatibilityReport(f, expected, 1),
    compatibilityReport(f, expected.slice(0, 1)),
    compatibilityReport(f, [
      "unrelated assertion one",
      "unrelated assertion two",
    ]),
    compatibilityReport(f, [
      expected[0],
      `production baseline ${wrongSha} reads candidate-written records`,
    ]),
    compatibilityReport(f, [expected[0], expected[0]]),
    compatibilityReport(f, expected, 0, ["failed", "passed"]),
    compatibilityReport(f, expected, 0, ["passed", "skipped"]),
  ];
  for (const invalidReport of invalidReports) {
    await writeFile(
      f.env.RELEASE_COMPATIBILITY_REPORT,
      JSON.stringify(invalidReport),
    );
    const rejected = record();
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /Compatibility report|Compatibility suite/);
    assert.equal(await readFile(accepted, "utf8").catch(() => ""), "");
  }
  await rm(f.env.RELEASE_COMPATIBILITY_REPORT);
  assert.notEqual(record().status, 0);
  await writeFile(
    f.env.RELEASE_COMPATIBILITY_REPORT,
    JSON.stringify(compatibilityReport(f, expected)),
  );
  const passed = record();
  assert.equal(passed.status, 0, passed.stderr);
});

test("the recovery receipt job accepts only one completed successful native compatibility job and step", async (t) => {
  const f = await fixture(t, {
    persistedContract: true,
    compatibilityTest: true,
  });
  await passingCompatibilityTestJob(f);
  const source = await prepareSourceRelease(f);
  const accepted = path.join(f.root, "native-proof.json");
  const failedJob = {
    ...passingCompatibilityJob(),
    conclusion: "failure",
  };
  const stepFails = (conclusion, status) => ({
    ...passingCompatibilityJob(),
    steps: [compatibilityStep(conclusion, status)],
  });
  const rejected = {
    "no native job": [],
    "job not completed": [passingCompatibilityJob(503, "in_progress")],
    "job failed": [failedJob],
    "job name not unique": [
      passingCompatibilityJob(503),
      passingCompatibilityJob(504),
    ],
    "step failed": [stepFails("failure")],
    "step missing": [{ ...passingCompatibilityJob(), steps: [] }],
  };
  for (const [name, jobs] of Object.entries(rejected)) {
    await setCompatibilityJobs(f, jobs);
    const result = run(f, "record-recovery-evidence", {
      ...source.env,
      RELEASE_ACCEPTED_STATE_FILE: accepted,
    });
    assert.notEqual(result.status, 0, name);
    assert.match(result.stderr, /compatibility (test|suite)/i, name);
    assert.equal(await readFile(accepted, "utf8").catch(() => ""), "", name);
  }

  await passingCompatibilityTestJob(f);
  const api = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    runs: { ...api.runs, 9: { ...api.runs[9], status: "completed" } },
  });
  const finishedRun = run(f, "record-recovery-evidence", {
    ...source.env,
    RELEASE_ACCEPTED_STATE_FILE: accepted,
  });
  assert.notEqual(finishedRun.status, 0);
  assert.match(finishedRun.stderr, /active release run/);
  assert.equal(await readFile(accepted, "utf8").catch(() => ""), "");
  await updateApi(f, { runs: api.runs });

  const wrongJob = run(f, "record-recovery-evidence", {
    ...source.env,
    RELEASE_ACCEPTED_STATE_FILE: accepted,
    GITHUB_JOB: "recovery-evidence",
  });
  assert.notEqual(wrongJob.status, 0);
  assert.match(wrongJob.stderr, /recovery receipt job/);
  assert.equal(await readFile(accepted, "utf8").catch(() => ""), "");

  const written = run(f, "record-recovery-evidence", {
    ...source.env,
    RELEASE_ACCEPTED_STATE_FILE: accepted,
  });
  assert.equal(written.status, 0, written.stderr);
  const state = JSON.parse(await readFile(accepted, "utf8"));
  assert.equal(state.compatibilityTest.jobId, "503");
  assert.equal(state.compatibilityTest.baselineSha, f.deployed);
  assert.equal(state.compatibilityTest.sourceSha, f.merge);
});

test("a release without a data risk records no compatibility proof", async (t) => {
  const f = await fixture(t);
  const { accepted } = await prepareAcceptedRelease(f);
  assert.equal(
    JSON.parse(await readFile(accepted, "utf8")).compatibilityTest,
    null,
  );
});

test("promote rejects a receipt whose compatibility job ID no longer matches", async (t) => {
  const f = await fixture(t, {
    persistedContract: true,
    compatibilityTest: true,
  });
  await passingCompatibilityTestJob(f);
  const { accepted } = await prepareAcceptedRelease(f);
  const state = JSON.parse(await readFile(accepted, "utf8"));
  state.compatibilityTest.jobId = "999";
  const wrongId = path.join(f.root, "wrong-job-id.json");
  await writeFile(wrongId, JSON.stringify(state));
  const callsBefore = JSON.parse(await readFile(f.statePath, "utf8")).calls;
  const mismatch = run(f, "promote", { RELEASE_STATE_FILE: wrongId });
  assert.notEqual(mismatch.status, 0);
  assert.match(mismatch.stderr, /did not pass natively/i);

  const after = JSON.parse(await readFile(f.statePath, "utf8"));
  assert.deepEqual(after.calls, callsBefore);
  assert.notEqual(after.alias, "dpl_cand");

  await passingCompatibilityTestJob(f);
  const promoted = run(f, "promote", { RELEASE_STATE_FILE: accepted });
  assert.equal(promoted.status, 0, promoted.stderr);
});

test("existing exact-source integration coverage may prove a persisted contract change", async (t) => {
  const f = await fixture(t, {
    persistedContract: true,
    baselineCompatibilityTest: true,
  });
  const suitePath =
    "test/integration/persistence/release-compatibility.itest.ts";
  assert.equal(
    f
      .git(["diff", "--name-only", f.deployed + ".." + f.merge])
      .split("\n")
      .includes(suitePath),
    false,
  );
  await passingCompatibilityTestJob(f);
  const release = await prepareAcceptedRelease(f);
  const proof = JSON.parse(await readFile(release.accepted, "utf8"));
  assert.equal(
    proof.recoveryEvidence.facts.database.compatibilityTest.path,
    suitePath,
  );
});

test("recovery revalidates the native compatibility test before rolling back", async (t) => {
  const f = await fixture(t, {
    persistedContract: true,
    compatibilityTest: true,
  });
  await passingCompatibilityTestJob(f);
  const { accepted } = await prepareAcceptedRelease(f);
  await updateApi(f, { alias: "dpl_cand" });
  let state = JSON.parse(await readFile(f.statePath, "utf8"));
  const job = state.jobs[9][0];
  job.steps[0].conclusion = "failure";
  await updateApi(f, { jobs: state.jobs });
  state = JSON.parse(await readFile(f.statePath, "utf8"));
  const callsBeforeRollback = state.calls;

  const denied = run(f, "rollback-if-compatible", {
    RELEASE_STATE_FILE: accepted,
  });
  assert.notEqual(denied.status, 0);
  assert.match(denied.stderr, /compatibility suite and report did not pass/i);
  const after = JSON.parse(await readFile(f.statePath, "utf8"));
  assert.equal(after.alias, "dpl_cand");
  assert.deepEqual(after.calls, callsBeforeRollback);
});

test("active production data marks a release forward-only when compatibility coverage is removed from the exact source", async (t) => {
  const f = await fixture(t, {
    persistedContract: true,
    removeCompatibilityTest: true,
  });
  const source = await prepareSourceRelease(f);
  const accepted = path.join(f.root, "removed-test-proof.json");
  const result = run(f, "record-recovery-evidence", {
    ...source.env,
    RELEASE_ACCEPTED_STATE_FILE: accepted,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /production-forward-only/);
});
