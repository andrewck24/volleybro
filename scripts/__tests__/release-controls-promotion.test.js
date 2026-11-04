import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  fixture,
  run,
  updateApi,
  workflowJob,
  approval,
  prepareAcceptedRelease,
  prepareFinalRelease,
  outputsOf,
} from "./release-controls-support.js";

test("rollback requires an intact run-bound receipt and ignores mutable evidence variables", async (t) => {
  const f = await fixture(t);
  const { accepted } = await prepareAcceptedRelease(f);
  const corrupted = path.join(f.root, "corrupted.json");
  const state = JSON.parse(await readFile(accepted, "utf8"));
  state.recoveryEvidence.facts.candidate.deploymentId = "dpl_forged";
  await writeFile(corrupted, JSON.stringify(state));
  await updateApi(f, { alias: "dpl_cand" });
  const denied = run(f, "rollback-if-compatible", {
    RELEASE_STATE_FILE: corrupted,
  });
  assert.notEqual(denied.status, 0);
  assert.match(denied.stderr, /receipt no longer matches/);
  assert.equal(
    JSON.parse(await readFile(f.statePath, "utf8")).alias,
    "dpl_cand",
  );
  let result = run(f, "rollback-if-compatible", {
    RELEASE_STATE_FILE: accepted,
    RELEASE_ACCEPTED_STATE_FILE: accepted,
    RELEASE_ROLLBACK_COMPATIBILITY: "forged",
    RELEASE_ROLLBACK_EVIDENCE: "https://attacker.example.test/claim",
  });
  assert.equal(result.status, 0, result.stderr);
  const actual = JSON.parse(await readFile(f.statePath, "utf8"));
  assert.equal(actual.alias, "dpl_base");
  assert.ok(
    actual.calls.some((args) =>
      args.includes("/v1/projects/test/rollback/dpl_base"),
    ),
  );
  await updateApi(f, { alias: "dpl_cand", healthStatus: 503 });
  result = run(f, "rollback-if-compatible", { RELEASE_STATE_FILE: accepted });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /health check returned HTTP 503/);
});

test("rollback rejects state v3 and requires a fresh authorized release", async (t) => {
  const f = await fixture(t);
  const { accepted } = await prepareAcceptedRelease(f);
  await updateApi(f, { alias: "dpl_cand" });
  const validAction = run(f, "rollback-if-compatible", {
    RELEASE_STATE_FILE: accepted,
    RELEASE_ACCEPTED_STATE_FILE: accepted,
  });
  assert.equal(validAction.status, 0, validAction.stderr);
  assert.equal(
    JSON.parse(await readFile(f.statePath, "utf8")).alias,
    "dpl_base",
  );

  const state = JSON.parse(await readFile(accepted, "utf8"));
  state.stateVersion = 3;
  const oldState = path.join(f.root, "old-state.json");
  await writeFile(oldState, JSON.stringify(state));
  await updateApi(f, { alias: "dpl_cand" });
  const callsBeforeRollback = JSON.parse(
    await readFile(f.statePath, "utf8"),
  ).calls;
  const oldStateEnv = {
    RELEASE_STATE_FILE: oldState,
    RELEASE_ACCEPTED_STATE_FILE: oldState,
  };
  const denied = run(f, "rollback-if-compatible", oldStateEnv);
  assert.notEqual(denied.status, 0);
  assert.match(
    denied.stderr,
    /Legacy release artifacts require a fresh authorized release run/,
  );
  const after = JSON.parse(await readFile(f.statePath, "utf8"));
  assert.equal(after.alias, "dpl_cand");
  assert.deepEqual(after.calls, callsBeforeRollback);
});

test("recovery receipt binds the source run, attempt, baseline, candidate, and database policy", async (t) => {
  const f = await fixture(t);
  const { accepted } = await prepareAcceptedRelease(f);
  const state = JSON.parse(await readFile(accepted, "utf8"));
  assert.equal(state.recoveryEvidence.schemaVersion, 2);
  assert.equal(state.recoveryEvidence.runId, "9");
  assert.equal(state.recoveryEvidence.runAttempt, "1");
  assert.equal(state.recoveryEvidence.facts.release.sourceSha, f.merge);
  assert.equal(state.recoveryEvidence.facts.baseline.deploymentId, "dpl_base");
  assert.equal(state.recoveryEvidence.facts.candidate.deploymentId, "dpl_cand");
  assert.equal(
    state.recoveryEvidence.facts.database.policy,
    "production-contract-unchanged",
  );
  assert.equal(state.recoveryEvidence.facts.database.productionActive, true);
  assert.equal(state.recoveryEvidence.facts.database.rollbackAllowed, true);
  assert.ok(Date.parse(state.recoveryEvidence.expiresAt) > Date.now());
});

test("promotion blocks stale baselines and pending candidates before calling Vercel", async (t) => {
  const f = await fixture(t);
  const { accepted } = await prepareAcceptedRelease(f);
  const env = { RELEASE_STATE_FILE: accepted };
  await updateApi(f, { alias: "dpl_hotfix" });
  let result = run(f, "promote", env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /baseline changed/);
  await updateApi(f, { alias: "dpl_base", readiness: "BUILDING" });
  assert.notEqual(run(f, "promote", env).status, 0);
  let state = JSON.parse(await readFile(f.statePath, "utf8"));
  assert.equal(
    state.calls.some((args) =>
      args.includes("/v10/projects/test/promote/dpl_cand"),
    ),
    false,
  );
  await updateApi(f, { readiness: "READY" });
  assert.equal(run(f, "promote", env).status, 0);
  state = JSON.parse(await readFile(f.statePath, "utf8"));
  assert.equal(state.alias, "dpl_cand");
  for (const mutationStatus of [403, 404]) {
    await updateApi(f, { alias: "dpl_base", mutationStatus });
    const denied = run(f, "promote", env);
    assert.notEqual(denied.status, 0);
    assert.match(denied.stderr, /Vercel API (403|404)/);
  }
  await updateApi(f, { alias: "dpl_base", mutationStatus: 0, delayPolls: 2 });
  assert.equal(run(f, "promote", env).status, 0);
  await updateApi(f, { alias: "dpl_base", neverTransition: true });
  const queued = run(f, "promote", env);
  assert.notEqual(queued.status, 0);
  assert.match(queued.stderr, /not confirmed/);
});

async function prepareMergeBackFixture(f, { conflict = false } = {}) {
  const packageJson = JSON.parse(
    await readFile(path.join(f.repo, "package.json"), "utf8"),
  );
  await writeFile(
    path.join(f.repo, "package.json"),
    `${JSON.stringify({ mainOnly: true, ...packageJson }, null, 2)}\n`,
  );
  await mkdir(path.join(f.repo, ".changeset"), { recursive: true });
  await writeFile(
    path.join(f.repo, ".changeset", "pending.md"),
    "---\\nfixture: minor\\n---\\n",
  );
  if (conflict)
    await writeFile(
      path.join(f.repo, "repair.js"),
      "export const fixed = false;\n",
    );
  f.git(["add", "."]);
  f.git([
    "commit",
    "-m",
    conflict ? "conflicting main work" : "pending main work",
  ]);
  f.git(["push", "origin", "main"]);
  await writeFile(
    f.env.RELEASE_STATE_FILE,
    `${JSON.stringify({
      stateVersion: 4,
      sha: f.hotfix,
      controllerSha: f.deployed,
      releaseRunId: "9",
      releaseRunAttempt: "1",
      releaseMode: "hotfix",
      candidateId: "dpl_hotfix",
      projectId: "test",
      productionAlias: "app.test",
      baseline: {
        deploymentId: "dpl_base",
        updatedAt: "1",
        sha: f.deployed,
      },
    })}\n`,
  );
}

test("merge-back preserves pending changesets and the hotfix parent without rebasing", async (t) => {
  const f = await fixture(t);
  await prepareMergeBackFixture(f);
  let result = run(f, "merge-back", { RELEASE_SHA: f.hotfix });
  assert.equal(result.status, 0, result.stderr);
  const branch = `hotfix-merge-back/${f.hotfix}`;
  const merge = execFileSync(
    "git",
    ["--git-dir", f.remote, "rev-parse", `refs/heads/${branch}`],
    { encoding: "utf8" },
  ).trim();
  const parents = execFileSync(
    "git",
    ["--git-dir", f.remote, "show", "-s", "--format=%P", merge],
    { encoding: "utf8" },
  )
    .trim()
    .split(" ");
  assert.equal(parents.length, 2);
  assert.equal(parents[1], f.hotfix);
  assert.equal(
    execFileSync(
      "git",
      ["--git-dir", f.remote, "show", `${merge}:.changeset/pending.md`],
      { encoding: "utf8" },
    ),
    "---\\nfixture: minor\\n---\\n",
  );
  const mergedPackage = JSON.parse(
    execFileSync(
      "git",
      ["--git-dir", f.remote, "show", `${merge}:package.json`],
      { encoding: "utf8" },
    ),
  );
  assert.equal(mergedPackage.version, "1.0.1");
  assert.equal(mergedPackage.mainOnly, true);
  assert.equal(mergedPackage.dependencies.secure, "2.0.0");
  result = run(f, "merge-back", { RELEASE_SHA: f.hotfix });
  assert.equal(result.status, 0, result.stderr);
  const api = JSON.parse(await readFile(f.statePath, "utf8"));
  const created = api.calls.find(
    (args) => args[0] === "pr" && args[1] === "create",
  );
  const body = created[created.indexOf("--body") + 1];
  assert.ok(body.includes(f.deployed), "Handoff identifies deployed baseline");
  assert.ok(body.includes(f.hotfix), "Handoff identifies published repair");
  assert.match(body, /WORKFLOW\.md/);
  assert.match(body, /agent handles review, conflict resolution and merge/);
  assert.match(body, /Merge requires explicit authorization/);
  assert.equal(
    api.calls.filter((args) => args[0] === "pr" && args[1] === "create").length,
    1,
  );
});

test("merge-back aborts unsupported conflicts and preserves the main checkout", async (t) => {
  const f = await fixture(t);
  await prepareMergeBackFixture(f, { conflict: true });
  const main = f.git(["rev-parse", "main"]);
  const result = run(f, "merge-back", { RELEASE_SHA: f.hotfix });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unsupported conflicts: repair\.js/);
  assert.equal(f.git(["branch", "--show-current"]), "main");
  assert.equal(f.git(["rev-parse", "HEAD"]), main);
  assert.equal(f.git(["status", "--porcelain"]), "");
  assert.equal(
    await readFile(path.join(f.repo, ".changeset", "pending.md"), "utf8"),
    "---\\nfixture: minor\\n---\\n",
  );
  assert.equal(
    await readFile(path.join(f.repo, "repair.js"), "utf8"),
    "export const fixed = false;\n",
  );
  assert.equal(
    f.git([
      "ls-remote",
      "--heads",
      "origin",
      `refs/heads/hotfix-merge-back/${f.hotfix}`,
    ]),
    "",
  );
});

test("finalize tags only the promoted exact SHA and repeats without duplicate Release", async (t) => {
  const f = await fixture(t);
  const { finalState } = await prepareFinalRelease(f);
  const env = { RELEASE_STATE_FILE: finalState };
  let result = run(f, "finalize", env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Accept production QA/);
  const withProduction = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    jobs: {
      ...withProduction.jobs,
      9: withProduction.jobs[9].map((job) =>
        job.id === 504
          ? { ...job, status: "completed", conclusion: "success" }
          : job,
      ),
    },
  });
  result = run(f, "finalize", env);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.git(["rev-parse", "v1.0.1"]), f.merge);
  assert.equal(run(f, "finalize", env).status, 0);
  const state = JSON.parse(await readFile(f.statePath, "utf8"));
  const creates = state.calls.filter(
    (args) => args[0] === "release" && args[1] === "create",
  );
  assert.equal(creates.length, 1);
  assert.equal(
    creates[0][creates[0].indexOf("--notes") + 1],
    "- Release changes",
  );
  assert.equal(creates[0].includes("--generate-notes"), false);
  f.git(["tag", "-f", "v1.0.1", `${f.merge}^1`]);
  result = run(f, "finalize", env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /different commit/);
});

test("finalize reports git's push error when the tag cannot be pushed", async (t) => {
  const f = await fixture(t);
  const { finalState } = await prepareFinalRelease(f);
  const withProduction = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    jobs: {
      ...withProduction.jobs,
      9: withProduction.jobs[9].map((job) =>
        job.id === 504
          ? { ...job, status: "completed", conclusion: "success" }
          : job,
      ),
    },
  });
  const hook = path.join(f.remote, "hooks", "pre-receive");
  await writeFile(
    hook,
    "#!/bin/sh\necho 'tag push rejected by test hook' >&2\nexit 1\n",
  );
  await chmod(hook, 0o755);
  const result = run(f, "finalize", { RELEASE_STATE_FILE: finalState });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /git push failed: [\s\S]*rejected by test hook/);
});

test("finalize succeeds when the tag push loses a race but the tag is at the promoted SHA", async (t) => {
  const f = await fixture(t);
  const { finalState } = await prepareFinalRelease(f);
  const withProduction = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    jobs: {
      ...withProduction.jobs,
      9: withProduction.jobs[9].map((job) =>
        job.id === 504
          ? { ...job, status: "completed", conclusion: "success" }
          : job,
      ),
    },
  });
  const hook = path.join(f.remote, "hooks", "pre-receive");
  await writeFile(
    hook,
    `#!/bin/sh\nenv -u GIT_QUARANTINE_PATH git update-ref refs/tags/v1.0.1 ${f.merge}\necho 'lost the race' >&2\nexit 1\n`,
  );
  await chmod(hook, 0o755);
  const result = run(f, "finalize", { RELEASE_STATE_FILE: finalState });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    f.git(["ls-remote", "origin", "refs/tags/v1.0.1"]).split("\t")[0],
    f.merge,
  );
});

async function finalizeRelease(f) {
  const { finalState } = await prepareFinalRelease(f);
  const env = { RELEASE_STATE_FILE: finalState };
  const withProduction = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    jobs: {
      ...withProduction.jobs,
      9: withProduction.jobs[9].map((job) =>
        job.id === 504
          ? { ...job, status: "completed", conclusion: "success" }
          : job,
      ),
    },
  });
  const result = run(f, "finalize", env);
  assert.equal(result.status, 0, result.stderr);
  const state = JSON.parse(await readFile(f.statePath, "utf8"));
  return state.calls.find(
    (args) => args[0] === "release" && args[1] === "create",
  );
}

test("finalize without changelog notes falls back to generated notes only", async (t) => {
  const create = await finalizeRelease(
    await fixture(t, { changelogEntry: false }),
  );
  assert.equal(create.includes("--notes"), false);
  assert.equal(create.includes("--generate-notes"), true);
});

test("finalize states a forward-only release in the GitHub Release notes", async (t) => {
  const f = await fixture(t, { persistedContract: true });
  const create = await finalizeRelease(f);
  assert.match(
    create[create.indexOf("--notes") + 1],
    new RegExp(
      `^- Release changes\\n\\nForward-only: no rollback to ${f.deployed}$`,
    ),
  );
  assert.equal(create.includes("--generate-notes"), false);
});

test("owner recovery verifies a forward-only release but rollback-if-compatible refuses it without touching the alias", async (t) => {
  const f = await fixture(t, { persistedContract: true });
  const { accepted } = await prepareAcceptedRelease(f);
  await updateApi(f, { alias: "dpl_cand" });
  const stateFile = path.join(f.root, "artifact", "release-state.json");
  const archive = path.join(f.root, "accepted.zip");
  await mkdir(path.dirname(stateFile));
  await writeFile(stateFile, await readFile(accepted));
  execFileSync("zip", ["-q", "-j", archive, stateFile]);
  const digest = createHash("sha256")
    .update(await readFile(archive))
    .digest("hex");
  const api = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    runs: {
      ...api.runs,
      10: {
        ...api.runs[9],
        id: 10,
        event: "workflow_dispatch",
        head_branch: "main",
        head_sha: f.merge,
        run_attempt: 1,
        status: "in_progress",
        actor: { login: "release-owner", id: 201 },
        triggering_actor: { login: "release-owner", id: 201 },
      },
    },
    artifacts: {
      ...api.artifacts,
      9: [
        {
          id: 700,
          name: "production-release-accepted-state",
          expired: false,
          expires_at: "2099-01-01T00:00:00Z",
          digest: `sha256:${digest}`,
          archive_download_url:
            "https://api.github.com/repos/owner/repo/actions/artifacts/700/zip",
          workflow_run: {
            id: 9,
            repository_id: 101,
            head_repository_id: 101,
            head_sha: f.merge,
          },
        },
      ],
    },
    artifactArchives: { 700: archive },
  });
  const recovery = path.join(f.root, "recovery.json");
  const recoveryEnv = {
    GITHUB_RUN_ID: "10",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_SHA: f.merge,
    GITHUB_JOB: "recover",
    ORIGINAL_RELEASE_RUN_ID: "9",
    RELEASE_RECOVERY_STATE_FILE: recovery,
  };
  // The refusal must come from rollback-if-compatible, not from recover-verify.
  const verified = run(f, "recover-verify", recoveryEnv);
  assert.equal(verified.status, 0, verified.stderr);
  const result = run(f, "rollback-if-compatible", {
    ...recoveryEnv,
    RELEASE_STATE_FILE: recovery,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /forward-only/);
  const after = JSON.parse(await readFile(f.statePath, "utf8"));
  assert.equal(after.alias, "dpl_cand");
  assert.doesNotMatch(JSON.stringify(after.calls), /rollback/);
});

test("recovery receipt cannot be created without trusted source CI receipts", async (t) => {
  const f = await fixture(t);
  assert.equal(run(f, "stage").status, 0);
  const accepted = path.join(f.root, "accepted.json");
  const result = run(f, "record-recovery-evidence", {
    RELEASE_ACCEPTED_STATE_FILE: accepted,
    RELEASE_ROLLBACK_COMPATIBILITY: "",
    RELEASE_ROLLBACK_EVIDENCE: "",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /source QA receipt/i);
  assert.equal(await readFile(accepted, "utf8").catch(() => ""), "");
});

test("promotion and publication require accepted receipts, not only a healthy alias", async (t) => {
  const f = await fixture(t);
  assert.equal(run(f, "stage").status, 0);
  const denied = run(f, "promote");
  assert.notEqual(denied.status, 0);
  assert.match(denied.stderr, /source QA receipt|recovery receipt/i);
  await updateApi(f, { alias: "dpl_cand" });
  const publication = run(f, "finalize");
  assert.notEqual(publication.status, 0);
  assert.match(publication.stderr, /production QA/i);
  assert.equal(f.git(["tag", "--list", "v1.0.1"]), "");
});

async function expireRecoveryReceipt(file, mutate = () => {}) {
  const state = JSON.parse(await readFile(file, "utf8"));
  const week = 7 * 24 * 60 * 60 * 1000;
  // One clock read: two reads can drift 1 ms and break the exact TTL span.
  const now = Date.now();
  state.recoveryEvidence.issuedAt = new Date(now - 2 * week).toISOString();
  state.recoveryEvidence.expiresAt = new Date(now - week).toISOString();
  mutate(state);
  await writeFile(file, JSON.stringify(state));
}

test("finalize tags after the recovery receipt expired but rejects a receipt bound to another run", async (t) => {
  const f = await fixture(t);
  const { finalState } = await prepareFinalRelease(f);
  const withProduction = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    jobs: {
      ...withProduction.jobs,
      9: withProduction.jobs[9].map((job) =>
        job.id === 504
          ? { ...job, status: "completed", conclusion: "success" }
          : job,
      ),
    },
  });
  const foreign = path.join(f.root, "foreign-final.json");
  await writeFile(foreign, await readFile(finalState, "utf8"));
  await expireRecoveryReceipt(foreign, (state) => {
    state.recoveryEvidence.runId = "10";
  });
  const denied = run(f, "finalize", { RELEASE_STATE_FILE: foreign });
  assert.notEqual(denied.status, 0);
  assert.match(denied.stderr, /bound to another release run/);
  await expireRecoveryReceipt(finalState);
  const result = run(f, "finalize", { RELEASE_STATE_FILE: finalState });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.git(["rev-parse", "v1.0.1"]), f.merge);
});

test("production QA recording survives an expired recovery receipt", async (t) => {
  const f = await fixture(t);
  const { accepted } = await prepareAcceptedRelease(f);
  await expireRecoveryReceipt(accepted);
  await updateApi(f, { alias: "dpl_cand" });
  const api = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    jobs: {
      ...api.jobs,
      9: [
        ...api.jobs[9],
        workflowJob(504, "Accept production QA", "in_progress", null),
      ],
    },
    approvals: { ...api.approvals, 9: [...api.approvals[9], approval("qa")] },
  });
  const result = run(f, "record-production-qa", {
    RELEASE_STATE_FILE: accepted,
    RELEASE_FINAL_STATE_FILE: path.join(f.root, "release-final-state.json"),
    GITHUB_JOB: "production-acceptance",
  });
  assert.equal(result.status, 0, result.stderr);
});

test("promote and rollback still reject an expired recovery receipt", async (t) => {
  const f = await fixture(t);
  const { accepted } = await prepareAcceptedRelease(f);
  await expireRecoveryReceipt(accepted);
  await updateApi(f, { alias: "dpl_cand" });
  for (const action of ["promote", "rollback-if-compatible"]) {
    const denied = run(f, action, { RELEASE_STATE_FILE: accepted });
    assert.notEqual(denied.status, 0, action);
    assert.match(denied.stderr, /Recovery receipt expired/, action);
  }
});

test("promote outputs the confirmed production deployment and source SHA", async (t) => {
  const f = await fixture(t);
  const { accepted } = await prepareAcceptedRelease(f);
  await writeFile(f.env.GITHUB_OUTPUT, "");
  const result = run(f, "promote", { RELEASE_STATE_FILE: accepted });
  assert.equal(result.status, 0, result.stderr);
  const outputs = await outputsOf(f);
  assert.equal(outputs.production_deployment_id, "dpl_cand");
  assert.equal(outputs.production_sha, f.merge);
});
