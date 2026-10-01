import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
  chmod,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const cli =
  process.env.RELEASE_TEST_CLI ||
  fileURLToPath(new URL("../release-controls.js", import.meta.url));

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "release-cli-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repo = path.join(root, "repo"),
    bin = path.join(root, "bin");
  await mkdir(repo);
  await mkdir(bin);
  const git = (args) =>
    execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
  git(["init", "-b", "main"]);
  git(["config", "user.email", "test@example.invalid"]);
  git(["config", "user.name", "Test"]);
  await mkdir(path.join(repo, ".changeset"));
  await writeFile(
    path.join(repo, "package.json"),
    '{"name":"fixture","version":"1.0.0"}',
  );
  await writeFile(path.join(repo, "CHANGELOG.md"), "# Changes\\n");
  await writeFile(
    path.join(repo, ".changeset", "one.md"),
    "---\\nfixture: patch\\n---\\n",
  );
  git(["add", "."]);
  git(["commit", "-m", "base"]);
  const base = git(["rev-parse", "HEAD"]);
  git(["checkout", "-b", "changeset-release/main"]);
  await writeFile(
    path.join(repo, "package.json"),
    '{"name":"fixture","version":"1.0.1"}',
  );
  await writeFile(
    path.join(repo, "CHANGELOG.md"),
    "# Changes\\n\\n## 1.0.1\\n",
  );
  await rm(path.join(repo, ".changeset", "one.md"));
  git(["add", "-A"]);
  git(["commit", "-m", "release"]);
  const head = git(["rev-parse", "HEAD"]);
  git(["checkout", "main"]);
  git(["merge", "--no-ff", "changeset-release/main", "-m", "merge"]);
  const merge = git(["rev-parse", "HEAD"]);
  const remote = path.join(root, "origin.git");
  execFileSync("git", ["init", "--bare", remote]);
  git(["remote", "add", "origin", remote]);
  const eventPath = path.join(root, "event.json");
  await writeFile(
    eventPath,
    JSON.stringify({
      action: "closed",
      pull_request: {
        number: 1,
        merged: true,
        merge_commit_sha: merge,
        head: { sha: head },
      },
    }),
  );
  const statePath = path.join(root, "api.json");
  await writeFile(
    statePath,
    JSON.stringify({
      alias: "dpl_base",
      updatedAt: "1",
      calls: [],
      pr: {
        number: 1,
        state: "closed",
        merged: true,
        merge_commit_sha: merge,
        user: { login: "release-owner" },
        title: "release: update versions",
        base: { ref: "main", sha: base, repo: { full_name: "owner/repo" } },
        head: {
          ref: "changeset-release/main",
          sha: head,
          repo: { full_name: "owner/repo" },
        },
      },
      checks: [
        {
          name: "Verify",
          head_sha: head,
          app: { id: 15368 },
          status: "completed",
          conclusion: "success",
          started_at: "2026-10-01T00:00:00Z",
        },
      ],
      statuses: [
        {
          context: "Vercel",
          sha: head,
          state: "success",
          updated_at: "2026-10-01T00:00:00Z",
        },
      ],
    }),
  );
  const stub = async (name, code) => {
    const p = path.join(bin, name);
    await writeFile(p, "#!/usr/bin/env node\n" + code);
    await chmod(p, 0o755);
  };
  await stub(
    "pnpm",
    "const fs=require('fs'),s=JSON.parse(fs.readFileSync(process.env.API_STATE)),a=process.argv.slice(2);s.calls.push(a);if(a.includes('rollback'))s.alias='dpl_base';if(a.includes('promote'))s.alias='dpl_cand';fs.writeFileSync(process.env.API_STATE,JSON.stringify(s));console.log(JSON.stringify({id:'dpl_cand',url:'candidate.test'}));",
  );
  await stub(
    "gh",
    "const fs=require('fs'),s=JSON.parse(fs.readFileSync(process.env.API_STATE)),a=process.argv.slice(2);let result;if(a[0]==='api'){const route=a[1];if(route.includes('/pulls/'))result=s.pr;else if(route.includes('/check-runs'))result={check_runs:s.checks};else if(route.includes('/statuses?'))result=s.statuses;else if(route.includes('/environments/'))result=s.environment||{protection_rules:[{type:'required_reviewers',reviewers:[{}]}]};else throw Error('Unexpected route '+route);}else if(a[1]==='view'){if(!s.existingRelease)process.exit(1);result={tagName:'v1.0.1'};}else if(a[1]==='create'){s.calls.push(a);s.existingRelease=true;fs.writeFileSync(process.env.API_STATE,JSON.stringify(s));result={};}else throw Error('Unexpected gh action');console.log(JSON.stringify(result));",
  );
  const preload = path.join(root, "preload.mjs");
  await writeFile(
    preload,
    "import fs from 'node:fs';globalThis.fetch=async(u)=>{const s=JSON.parse(fs.readFileSync(process.env.API_STATE));if(String(u).includes('/v4/aliases/'))return Response.json({alias:'app.test',deploymentId:s.alias,updatedAt:s.updatedAt});if(String(u).includes('/v13/deployments/'))return Response.json({id:'dpl_cand',readyState:s.readiness||'READY',target:'production',meta:{releaseSha:process.env.RELEASE_SHA},alias:[],...s.candidate});return new Response('',{status:s.healthStatus||200})};",
  );
  return {
    root,
    repo,
    merge,
    head,
    git,
    eventPath,
    statePath,
    preload,
    env: {
      PATH: bin + ":" + process.env.PATH,
      API_STATE: statePath,
      RELEASE_SHA: merge,
      GITHUB_SHA: merge,
      VERCEL_TOKEN: "test",
      VERCEL_PROJECT: "test",
      PRODUCTION_ALIAS: "app.test",
      RELEASE_STATE_FILE: path.join(root, "staged.json"),
      GITHUB_OUTPUT: path.join(root, "output"),
      GITHUB_RUN_ID: "9",
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_REPOSITORY: "owner/repo",
      RELEASE_BOT_LOGIN: "release-owner",
    },
  };
}

function run(f, action, extra = {}) {
  return spawnSync(process.execPath, ["--import", f.preload, cli, action], {
    cwd: f.repo,
    env: { ...process.env, ...f.env, ...extra },
    encoding: "utf8",
  });
}

test("stage runs the real CLI and records exact checkout SHA, baseline, and candidate", async (t) => {
  const f = await fixture(t),
    result = run(f, "stage");
  assert.equal(result.status, 0, result.stderr);
  const recorded = JSON.parse(await readFile(f.env.RELEASE_STATE_FILE, "utf8"));
  assert.equal(recorded.sha, f.merge);
  assert.equal(recorded.candidateId, "dpl_cand");
  assert.deepEqual(recorded.baseline, {
    deploymentId: "dpl_base",
    updatedAt: "1",
  });
  for (const candidate of [
    { id: "dpl_other" },
    { target: "preview" },
    { meta: { releaseSha: "wrong-sha" } },
    { alias: ["app.test"] },
    { readyState: "BUILDING" },
  ]) {
    await updateApi(f, { candidate });
    const invalid = run(f, "stage");
    assert.notEqual(invalid.status, 0, JSON.stringify(candidate));
  }
});

test("rollback requires accepted run-bound evidence, not mutable environment values", async (t) => {
  const f = await fixture(t);
  assert.equal(run(f, "stage").status, 0);
  const binding = "dpl_base:dpl_cand:" + f.merge,
    accepted = path.join(f.root, "accepted.json");
  await updateApi(f, { alias: "dpl_cand" });
  let result = run(f, "rollback-if-compatible", {
    RELEASE_ROLLBACK_COMPATIBILITY: binding,
  });
  assert.notEqual(result.status, 0);
  result = run(f, "record-compatibility", {
    RELEASE_ROLLBACK_COMPATIBILITY: binding,
    RELEASE_ROLLBACK_EVIDENCE: "",
    RELEASE_ACCEPTED_STATE_FILE: accepted,
  });
  assert.equal(result.status, 0, result.stderr);
  result = run(f, "rollback-if-compatible", { RELEASE_STATE_FILE: accepted });
  assert.notEqual(result.status, 0);
  result = run(f, "record-compatibility", {
    RELEASE_ROLLBACK_COMPATIBILITY: binding,
    RELEASE_ROLLBACK_EVIDENCE: "https://evidence.example.test/review",
    RELEASE_ACCEPTED_STATE_FILE: accepted,
  });
  assert.equal(result.status, 0, result.stderr);
  const api = JSON.parse(await readFile(f.statePath, "utf8"));
  api.alias = "dpl_cand";
  await writeFile(f.statePath, JSON.stringify(api));
  result = run(f, "rollback-if-compatible", { RELEASE_STATE_FILE: accepted });
  assert.equal(result.status, 0, result.stderr);
  const actual = JSON.parse(await readFile(f.statePath, "utf8"));
  assert.equal(actual.alias, "dpl_base");
  assert.ok(actual.calls.some((args) => args.includes("rollback")));
  await updateApi(f, { alias: "dpl_cand", healthStatus: 503 });
  result = run(f, "rollback-if-compatible", { RELEASE_STATE_FILE: accepted });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /health check returned HTTP 503/);
});

async function updateApi(f, values) {
  const current = JSON.parse(await readFile(f.statePath, "utf8"));
  await writeFile(f.statePath, JSON.stringify({ ...current, ...values }));
}

test("authorize validates the real PR, exact check sources and metadata through CLI", async (t) => {
  const f = await fixture(t);
  const valid = run(f, "authorize");
  assert.equal(valid.status, 0, valid.stderr);
  const original = JSON.parse(await readFile(f.statePath, "utf8"));
  for (const override of [
    { environment: { protection_rules: [] } },
    { checks: [] },
    { checks: [{ ...original.checks[0], app: { id: 999 } }] },
    { checks: [{ ...original.checks[0], head_sha: f.merge }] },
    {
      checks: [
        ...original.checks,
        {
          ...original.checks[0],
          conclusion: "failure",
          started_at: "2026-10-02T00:00:00Z",
        },
      ],
    },
    {
      statuses: [
        { ...original.statuses[0], context: "Vercel Preview Comments" },
      ],
    },
    { statuses: [{ ...original.statuses[0], state: "pending" }] },
    { statuses: [{ ...original.statuses[0], sha: f.merge }] },
    {
      statuses: [
        ...original.statuses,
        {
          ...original.statuses[0],
          state: "failure",
          updated_at: "2026-10-02T00:00:00Z",
        },
      ],
    },
    { pr: { ...original.pr, user: { login: "impostor" } } },
  ]) {
    await updateApi(f, { ...original, environment: undefined, ...override });
    assert.notEqual(run(f, "authorize").status, 0, JSON.stringify(override));
  }
  await updateApi(f, { ...original, environment: undefined });
  await writeFile(
    path.join(f.repo, "runtime.js"),
    "export const changed = true;\n",
  );
  f.git(["add", "runtime.js"]);
  f.git(["commit", "--amend", "--no-edit"]);
  const invalid = f.git(["rev-parse", "HEAD"]);
  const pr = { ...original.pr, merge_commit_sha: invalid };
  await updateApi(f, { pr });
  await writeFile(
    f.eventPath,
    JSON.stringify({ pull_request: { ...pr, head: { sha: f.head } } }),
  );
  const result = run(f, "authorize", { GITHUB_SHA: invalid });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /non-metadata change/);
});

test("open version PR validation has no release authority and rejects foreign changes", async (t) => {
  const f = await fixture(t);
  const current = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    pr: { ...current.pr, state: "open", merged: false },
    checks: [],
    statuses: [],
  });
  await writeFile(
    f.eventPath,
    JSON.stringify({ action: "opened", pull_request: { number: 1 } }),
  );
  assert.equal(run(f, "validate-version-pr").status, 0);
  assert.notEqual(run(f, "authorize").status, 0);
  await updateApi(f, {
    pr: {
      ...current.pr,
      state: "open",
      merged: false,
      head: { ...current.pr.head, repo: { full_name: "foreign/repo" } },
    },
  });
  assert.notEqual(run(f, "validate-version-pr").status, 0);
});

test("promotion blocks stale baselines and pending candidates before calling Vercel", async (t) => {
  const f = await fixture(t);
  assert.equal(run(f, "stage").status, 0);
  await updateApi(f, { alias: "dpl_hotfix" });
  let result = run(f, "promote");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /baseline changed/);
  await updateApi(f, { alias: "dpl_base", readiness: "BUILDING" });
  assert.notEqual(run(f, "promote").status, 0);
  let state = JSON.parse(await readFile(f.statePath, "utf8"));
  assert.equal(
    state.calls.some((args) => args.includes("promote")),
    false,
  );
  await updateApi(f, { readiness: "READY" });
  assert.equal(run(f, "promote").status, 0);
  state = JSON.parse(await readFile(f.statePath, "utf8"));
  assert.equal(state.alias, "dpl_cand");
});

test("finalize tags only the promoted exact SHA and repeats without duplicate Release", async (t) => {
  const f = await fixture(t);
  assert.equal(run(f, "stage").status, 0);
  assert.notEqual(run(f, "finalize").status, 0);
  await updateApi(f, { alias: "dpl_cand" });
  let result = run(f, "finalize");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.git(["rev-parse", "v1.0.1"]), f.merge);
  assert.equal(run(f, "finalize").status, 0);
  const state = JSON.parse(await readFile(f.statePath, "utf8"));
  assert.equal(
    state.calls.filter((args) => args[0] === "release" && args[1] === "create")
      .length,
    1,
  );
  f.git(["tag", "-f", "v1.0.1", `${f.merge}^1`]);
  result = run(f, "finalize");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /different commit/);
});
