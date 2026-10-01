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

const cli = fileURLToPath(new URL("../release-controls.js", import.meta.url));

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
  const statePath = path.join(root, "api.json");
  await writeFile(
    statePath,
    JSON.stringify({ alias: "dpl_base", updatedAt: "1", calls: [] }),
  );
  const stub = async (name, code) => {
    const p = path.join(bin, name);
    await writeFile(p, "#!/usr/bin/env node\n" + code);
    await chmod(p, 0o755);
  };
  await stub(
    "pnpm",
    "const fs=require('fs'),s=JSON.parse(fs.readFileSync(process.env.API_STATE)),a=process.argv.slice(2);s.calls.push(a);if(a.includes('rollback'))s.alias='dpl_base';fs.writeFileSync(process.env.API_STATE,JSON.stringify(s));console.log(JSON.stringify({id:'dpl_cand',url:'candidate.test'}));",
  );
  await stub(
    "gh",
    "console.log(JSON.stringify({protection_rules:[{type:'required_reviewers',reviewers:[{}]}]}));",
  );
  const preload = path.join(root, "preload.mjs");
  await writeFile(
    preload,
    "import fs from 'node:fs';globalThis.fetch=async(u)=>{const s=JSON.parse(fs.readFileSync(process.env.API_STATE));if(String(u).includes('/v4/aliases/'))return Response.json({alias:'app.test',deploymentId:s.alias,updatedAt:s.updatedAt});if(String(u).includes('/v13/deployments/'))return Response.json({id:'dpl_cand',readyState:'READY',target:'production',meta:{releaseSha:process.env.RELEASE_SHA},alias:[]});return new Response('',{status:200})};",
  );
  return {
    root,
    repo,
    merge,
    head,
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
});

test("rollback requires accepted run-bound evidence, not mutable environment values", async (t) => {
  const f = await fixture(t);
  assert.equal(run(f, "stage").status, 0);
  const binding = "dpl_base:dpl_cand:" + f.merge,
    accepted = path.join(f.root, "accepted.json");
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
});
