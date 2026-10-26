import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
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
import { persistedContractChanges } from "../release-controls.js";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const cli =
  process.env.RELEASE_TEST_CLI ||
  fileURLToPath(new URL("../release-controls.js", import.meta.url));

const lockfile = (version) =>
  `packages:\n\n  better-auth@${version}:\n    resolution: {}\n`;

async function fixture(
  t,
  {
    persistedContract = false,
    persistedContractPath = "src/infrastructure/db/schema.ts",
    compatibilityTest = false,
    baselineCompatibilityTest = false,
    removeCompatibilityTest = false,
    hotfixPath = "repair.js",
    hotfixDependency = "2.0.0",
    changelogEntry = true,
    releaseAuthVersion,
  } = {},
) {
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
  const compatibilityPath = path.join(
    repo,
    "test/integration/persistence/release-compatibility.itest.ts",
  );
  if (removeCompatibilityTest) {
    await mkdir(path.dirname(compatibilityPath), { recursive: true });
    await writeFile(
      compatibilityPath,
      "// fixture: prior compatibility coverage removed by this source\n",
    );
  }
  await mkdir(path.join(repo, ".changeset"));
  await writeFile(
    path.join(repo, "package.json"),
    `${JSON.stringify(
      { name: "fixture", version: "1.0.0", dependencies: { secure: "1.0.0" } },
      null,
      2,
    )}\n`,
  );
  await writeFile(path.join(repo, "CHANGELOG.md"), "# Changes\n");
  await writeFile(path.join(repo, "pnpm-lock.yaml"), lockfile("1.7.12"));
  if (baselineCompatibilityTest) {
    await mkdir(path.dirname(compatibilityPath), { recursive: true });
    await writeFile(
      compatibilityPath,
      "// fixture: existing integration coverage in the deployed baseline\\n",
    );
  }
  git(["add", "."]);
  git(["commit", "-m", "deployed"]);
  const deployed = git(["rev-parse", "HEAD"]);
  git(["tag", "v1.0.0", deployed]);
  if (persistedContract) {
    const contractPath = path.join(repo, persistedContractPath);
    await mkdir(path.dirname(contractPath), { recursive: true });
    await writeFile(contractPath, "export const schemaRevision = 2;\n");
  }
  if (compatibilityTest) {
    await mkdir(path.dirname(compatibilityPath), { recursive: true });
    await writeFile(
      compatibilityPath,
      "// fixture: dedicated integration coverage in the release source\n",
    );
  }
  if (removeCompatibilityTest) await rm(compatibilityPath);
  await writeFile(
    path.join(repo, ".changeset", "one.md"),
    "---\\nfixture: patch\\n---\\n",
  );
  if (releaseAuthVersion)
    await writeFile(
      path.join(repo, "pnpm-lock.yaml"),
      lockfile(releaseAuthVersion),
    );
  git(["add", ".changeset/one.md", "pnpm-lock.yaml"]);
  git(["commit", "-m", "integrated change"]);
  const base = git(["rev-parse", "HEAD"]);
  git(["checkout", "-b", "changeset-release/main"]);
  await writeFile(
    path.join(repo, "package.json"),
    `${JSON.stringify(
      { name: "fixture", version: "1.0.1", dependencies: { secure: "1.0.0" } },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    path.join(repo, "CHANGELOG.md"),
    changelogEntry
      ? "# Changes\n\n## [1.0.1]\n\n- Release changes\n"
      : "# Changes\n",
  );
  await rm(path.join(repo, ".changeset", "one.md"));
  git(["add", "-A"]);
  git(["commit", "-m", "release"]);
  const head = git(["rev-parse", "HEAD"]);
  git(["checkout", "main"]);
  git(["merge", "--no-ff", "changeset-release/main", "-m", "merge"]);
  const merge = git(["rev-parse", "HEAD"]);
  git(["checkout", "-b", "hotfix/urgent", deployed]);
  await writeFile(
    path.join(repo, "package.json"),
    `${JSON.stringify(
      {
        name: "fixture",
        version: "1.0.1",
        dependencies: { secure: hotfixDependency },
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    path.join(repo, "CHANGELOG.md"),
    "# Changes\n\n## [1.0.1]\n\n- Release changes\n",
  );
  const hotfixFile = path.join(repo, hotfixPath);
  await mkdir(path.dirname(hotfixFile), { recursive: true });
  await writeFile(
    hotfixFile,
    hotfixPath.endsWith(".md") ? "# Repair\n" : "export const fixed = true;\n",
  );
  git(["add", "."]);
  git(["commit", "-m", "security repair"]);
  const hotfix = git(["rev-parse", "HEAD"]);
  git(["checkout", "main"]);
  const remote = path.join(root, "origin.git");
  execFileSync("git", ["init", "--bare", remote]);
  git(["remote", "add", "origin", remote]);
  git([
    "push",
    "origin",
    "main",
    "changeset-release/main",
    "hotfix/urgent",
    "--tags",
  ]);
  const eventPath = path.join(root, "event.json");
  await writeFile(
    eventPath,
    JSON.stringify({ ref: "refs/heads/main", before: base, after: merge }),
  );
  const statePath = path.join(root, "api.json");
  await writeFile(
    statePath,
    JSON.stringify({
      alias: "dpl_base",
      updatedAt: "1",
      baselineSha: deployed,
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
          creator: { id: 35613825, login: "vercel[bot]", type: "Bot" },
          url: `https://api.github.com/repos/owner/repo/statuses/${head}`,
          state: "success",
          updated_at: "2026-10-01T00:00:00Z",
        },
      ],
      workflow: { id: 42, path: ".github/workflows/ci.yml" },
      workflowBlobs: {
        [deployed]: "a".repeat(40),
        [merge]: "a".repeat(40),
        [head]: "a".repeat(40),
        [hotfix]: "a".repeat(40),
      },
      ciRuns: [
        {
          id: 77,
          path: ".github/workflows/ci.yml@refs/heads/main",
          workflow_id: 42,
          event: "workflow_dispatch",
          head_sha: merge,
          run_attempt: 1,
          status: "completed",
          repository: { id: 101, full_name: "owner/repo" },
          head_repository: { id: 101, full_name: "owner/repo" },
        },
      ],
      runs: {
        77: {
          id: 77,
          path: ".github/workflows/ci.yml@refs/heads/main",
          workflow_id: 42,
          event: "workflow_dispatch",
          head_sha: merge,
          run_attempt: 1,
          status: "completed",
          repository: { id: 101, full_name: "owner/repo" },
          head_repository: { id: 101, full_name: "owner/repo" },
        },
        9: {
          id: 9,
          path: ".github/workflows/production-release.yml@refs/heads/main",
          event: "push",
          head_branch: "main",
          head_sha: merge,
          run_attempt: 1,
          status: "in_progress",
          repository: { id: 101, full_name: "owner/repo" },
          head_repository: { id: 101, full_name: "owner/repo" },
          actor: { login: "release-owner", id: 201 },
          triggering_actor: { login: "release-owner", id: 201 },
        },
      },
      jobs: {
        9: [],
        77: ["Test", "Integration"].map((name, index) =>
          ciScopeJob(git, 601 + index, name, merge),
        ),
      },
      approvals: { 9: [] },
      artifacts: { 9: [] },
    }),
  );
  const stub = async (name, code) => {
    const p = path.join(bin, name);
    await writeFile(p, "#!/usr/bin/env node\n" + code);
    await chmod(p, 0o755);
  };
  await stub(
    "pnpm",
    "const fs=require('fs'),s=JSON.parse(fs.readFileSync(process.env.API_STATE)),a=process.argv.slice(2);s.calls.push(a);fs.writeFileSync(process.env.API_STATE,JSON.stringify(s));if(a.includes('--scope')||a.includes('promote')||a.includes('rollback')){console.error('User not found. (404)');process.exit(1);}if(!process.env.VERCEL_PROJECT_ID||!process.env.VERCEL_ORG_ID){console.error('Missing linked project context');process.exit(1);}console.log(JSON.stringify(a.includes('--prod')?{id:'dpl_cand',url:'candidate.test'}:{id:'dpl_preview',url:'random-preview.test'}));",
  );
  await stub(
    "gh",
    String.raw`const fs=require('fs'),cp=require('child_process');
const s=JSON.parse(fs.readFileSync(process.env.API_STATE)),a=process.argv.slice(2);let result;
if(a[0]==='api'){
  const route=a[1];
  if(/\/commits\/[0-9a-f]+\/pulls$/.test(route)){
    s.pullLookups=(s.pullLookups||0)+1;fs.writeFileSync(process.env.API_STATE,JSON.stringify(s));
    const merged=[{...s.pr,merged_at:s.pr.merged?'2026-10-01T00:00:00Z':null}];
    result=s.pullLookups<=(s.emptyLookups||0)?[]:s.commitPulls||merged;
  }
  else if(route.includes('/pulls?'))result=s.mergeBackPr?[s.mergeBackPr]:[];
  else if(route.includes('/pulls/'))result=s.pr;
  else if(route.includes('/check-runs'))result={check_runs:s.checks};
  else if(route.includes('/statuses?'))result=s.statuses;
  else if(route.includes('/environments/'))result=s.environment||{protection_rules:[{type:'required_reviewers',reviewers:[{}]}]};
  else if(route.includes('/actions/workflows/ci.yml/runs?'))result={total_count:s.ciRuns.length,workflow_runs:s.ciRuns};
  else if(route.endsWith('/actions/workflows/ci.yml'))result=s.workflow;
  else if(route.includes('/contents/.github/workflows/ci.yml')){const ref=new URL('https://example.test/?'+route.split('?')[1]).searchParams.get('ref');result={path:'.github/workflows/ci.yml',sha:s.workflowBlobs[ref]};}
  else if(route.includes('/git/commits/')){const sha=route.split('/git/commits/')[1];result={sha,tree:{sha:cp.execFileSync('git',['rev-parse',sha+'^{tree}'],{encoding:'utf8'}).trim()}};}
  else {const match=route.match(/\/actions\/runs\/(\d+)(?:\/(jobs|approvals|artifacts))?/);if(!match)throw Error('Unexpected route '+route);const id=match[1],kind=match[2];if(kind==='jobs'){const jobs=s.jobs[id]||[];result={total_count:jobs.length,jobs};}else if(kind==='approvals')result=s.approvals[id]||[];else if(kind==='artifacts'){const artifacts=s.artifacts[id]||[];result={total_count:artifacts.length,artifacts};}else result=s.runs[id];}
}else if(a[0]==='release'&&a[1]==='view'){if(!s.existingRelease)process.exit(1);result={tagName:'v1.0.1'};
}else if(a[0]==='release'&&a[1]==='create'){s.calls.push(a);s.existingRelease=true;fs.writeFileSync(process.env.API_STATE,JSON.stringify(s));result={};
}else if(a[0]==='pr'&&a[1]==='create'){const branch=a[a.indexOf('--head')+1],sha=cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();s.calls.push(a);s.mergeBackPr={state:'open',merged_at:null,html_url:'https://example.test/pull/2',base:{ref:'main',repo:{full_name:'owner/repo'}},head:{ref:branch,sha,repo:{full_name:'owner/repo'}}};fs.writeFileSync(process.env.API_STATE,JSON.stringify(s));console.log(s.mergeBackPr.html_url);return;
}else throw Error('Unexpected gh action');
console.log(JSON.stringify(result));`,
  );
  const preload = path.join(root, "preload.mjs");
  await writeFile(
    preload,
    String.raw`import fs from 'node:fs';
let elapsed=0;const now=Date.now;Date.now=()=>now()+elapsed;
globalThis.setTimeout=(callback,ms)=>{elapsed+=ms;callback();return 0};
globalThis.fetch=async(u,options={})=>{
  const s=JSON.parse(fs.readFileSync(process.env.API_STATE)),url=new URL(u);
  const save=()=>fs.writeFileSync(process.env.API_STATE,JSON.stringify(s));
  const artifact=url.pathname.match(/\/actions\/artifacts\/(\d+)\/zip$/);
  if(url.hostname==='api.github.com'&&artifact){const file=s.artifactArchives?.[artifact[1]];if(!file)return new Response('',{status:404});return new Response(fs.readFileSync(file));}
  if(options.method==='POST'){
    s.calls.push([url.pathname]);save();
    const match=url.pathname.match(/^\/v(10|1)\/projects\/test\/(promote|rollback)\/(dpl_cand|dpl_base)$/);
    if(!match)throw Error('Unexpected mutation '+url.pathname);
    if(s.mutationStatus)return new Response('',{status:s.mutationStatus});
    s.pendingAlias=match[3];s.remainingPolls=s.delayPolls||0;save();
    return new Response(null,{status:202});
  }
  if(url.pathname.includes('/v4/aliases/')){
    const requested=decodeURIComponent(url.pathname.split('/').at(-1));
    if(requested!=='app.test')throw Error('Unexpected alias '+requested);
    if(s.pendingAlias&&!s.neverTransition){if(s.remainingPolls>0)s.remainingPolls--;else{s.alias=s.pendingAlias;delete s.pendingAlias;}save();}
    return Response.json({alias:'app.test',deploymentId:s.alias,updatedAt:s.updatedAt});
  }
  if(url.pathname.includes('/v13/deployments/')){
    const id=url.pathname.split('/').at(-1);
    if(id==='dpl_cand')return Response.json({id,projectId:'test',readyState:s.readiness||'READY',target:'production',meta:{releaseSha:process.env.RELEASE_SHA},alias:[],...s.candidate});
    return Response.json({id,projectId:'test',readyState:'READY',target:'production',meta:{releaseSha:(s.deploymentShas||{})[id]||s.baselineSha},...(s.deployments||{})[id]});
  }
  if(url.pathname==='/v10/projects/test/env'){if(s.envStatus)return new Response('',{status:s.envStatus});return Response.json({envs:s.envs||[]});}
  if(url.pathname==='/v9/projects/test')return Response.json(s.project||{id:'test',ssoProtection:{deploymentType:'all_except_custom_domains'}});
  if(url.pathname==='/v9/projects/test/domains')return Response.json(s.domains||{domains:[{name:'app.test',gitBranch:null}]});
  return new Response('',{status:s.healthStatus||200});
};`,
  );
  return {
    root,
    repo,
    remote,
    persistedContract,
    persistedContractPath,
    compatibilityTest,
    removeCompatibilityTest,
    deployed,
    merge,
    head,
    hotfix,
    git,
    eventPath,
    statePath,
    preload,
    env: {
      PATH: bin + ":" + process.env.PATH,
      API_STATE: statePath,
      RELEASE_SHA: merge,
      RELEASE_MODE: "normal",
      CONTROLLER_SHA: deployed,
      GITHUB_SHA: merge,
      VERCEL_TOKEN: "test",
      VERCEL_PROJECT: "test",
      VERCEL_PROJECT_ID: "test",
      VERCEL_ORG_ID: "team_test",
      VERCEL_TEAM_SLUG: "test-team",
      PRODUCTION_ALIAS: "app.test",
      RELEASE_STATE_FILE: path.join(root, "staged.json"),
      GITHUB_OUTPUT: path.join(root, "output"),
      GITHUB_RUN_ID: "9",
      GITHUB_RUN_ATTEMPT: "1",
      GITHUB_JOB: "recovery-receipt",
      GH_TOKEN: "test",
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_REPOSITORY: "owner/repo",
      RELEASE_BOT_LOGIN: "release-owner",
      RELEASE_OWNER_LOGIN: "release-owner",
      GITHUB_ACTOR: "release-owner",
      GITHUB_TRIGGERING_ACTOR: "release-owner",
      GITHUB_EVENT_NAME: "push",
      GITHUB_REF: "refs/heads/main",
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
  assert.equal(recorded.releaseMode, "normal");
  assert.equal(recorded.stateVersion, 4);
  assert.equal(Object.hasOwn(recorded, "productionDatabaseActive"), false);
  assert.deepEqual(recorded.baseline, {
    deploymentId: "dpl_base",
    updatedAt: "1",
    sha: f.deployed,
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

test("stage stops before deployment when release mode is unknown", async (t) => {
  const f = await fixture(t);
  for (const override of [{ RELEASE_MODE: "" }, { RELEASE_MODE: "preview" }]) {
    const result = run(f, "stage", override);
    assert.notEqual(result.status, 0, JSON.stringify(override));
  }
  assert.deepEqual(JSON.parse(await readFile(f.statePath, "utf8")).calls, []);
});

test("stage permits protected generated aliases but rejects production or unknown aliases", async (t) => {
  const f = await fixture(t);
  const candidate = {
    alias: ["project-team.vercel.app"],
    automaticAliases: ["project-team.vercel.app"],
  };
  await updateApi(f, { candidate });
  const valid = run(f, "stage");
  assert.equal(valid.status, 0, valid.stderr);
  for (const override of [
    { candidate: { ...candidate, projectId: "other" } },
    { candidate: { ...candidate, automaticAliases: [] } },
    { candidate: { alias: ["app.test"], automaticAliases: ["app.test"] } },
    {
      domains: {
        domains: [{ name: "app.test" }, { name: "project-team.vercel.app" }],
      },
    },
    { project: { id: "test", ssoProtection: null } },
    { domains: { domains: [{ name: "app.test" }], pagination: { next: 123 } } },
  ]) {
    await updateApi(f, {
      candidate,
      project: undefined,
      domains: undefined,
      ...override,
    });
    assert.notEqual(run(f, "stage").status, 0, JSON.stringify(override));
  }
  await updateApi(f, { candidate, project: undefined, domains: undefined });
  assert.equal(run(f, "stage").status, 0);
  const { accepted } = await prepareAcceptedRelease(f, { staged: true });
  await updateApi(f, { project: { id: "test", ssoProtection: null } });
  const denied = run(f, "promote", { RELEASE_STATE_FILE: accepted });
  assert.notEqual(denied.status, 0);
  assert.match(denied.stderr, /Standard Protection/);
  const state = JSON.parse(await readFile(f.statePath, "utf8"));
  assert.equal(state.alias, "dpl_base");
});

test("normal retry preserves merged version SHA and binds owner authorization through staging", async (t) => {
  const f = await fixture(t);
  const env = {
    GITHUB_EVENT_NAME: "workflow_dispatch",
    RELEASE_PR_NUMBER: "1",
    RELEASE_SHA: f.merge,
    CONTROLLER_SHA: f.merge,
  };
  const result = run(f, "authorize-retry", env);
  assert.equal(result.status, 0, result.stderr);
  const authorized = JSON.parse(result.stdout);
  assert.equal(authorized.sha, f.merge);
  assert.equal(authorized.version, "1.0.1");
  const bound = {
    ...env,
    RELEASE_MODE: "normal-retry",
    RELEASE_AUTHORIZATION: JSON.stringify(authorized.authorization),
  };
  assert.equal(run(f, "stage", bound).status, 0);
  const denied = run(f, "promote", {
    ...bound,
    GITHUB_TRIGGERING_ACTOR: "outsider",
  });
  assert.notEqual(denied.status, 0);
  for (const override of [
    { GITHUB_ACTOR: "outsider" },
    { GITHUB_REF: "refs/heads/other" },
    { RELEASE_SHA: f.head },
    { CONTROLLER_SHA: f.deployed },
  ]) {
    assert.notEqual(
      run(f, "authorize-retry", { ...env, ...override }).status,
      0,
    );
  }
  const current = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, { pr: { ...current.pr, merged: false, state: "open" } });
  assert.notEqual(run(f, "authorize-retry", env).status, 0);
});

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

async function updateApi(f, values) {
  const current = JSON.parse(await readFile(f.statePath, "utf8"));
  await writeFile(f.statePath, JSON.stringify({ ...current, ...values }));
}

function workflowJob(
  id,
  name,
  status = "completed",
  conclusion = "success",
  steps,
) {
  return {
    id,
    name,
    status,
    conclusion,
    run_attempt: 1,
    ...(steps && { steps }),
  };
}

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

function ciScopeJob(git, id, name, source) {
  return {
    ...workflowJob(id, name),
    steps: [
      `Producer workflow ${source}`,
      `Source tree ${git(["rev-parse", `${source}^{tree}`])} at ${source}`,
    ].map((name) => ({ name, status: "completed", conclusion: "success" })),
  };
}

function approval(login = "reviewer") {
  return {
    state: "approved",
    comment: "Reviewed persisted evidence",
    environments: [
      {
        id: 301,
        name: "production-release-review",
        url: "https://api.github.com/repos/owner/repo/environments/production-release-review",
        html_url:
          "https://github.com/owner/repo/deployments/activity_log?environments_filter=production-release-review",
      },
    ],
    user: { login, id: login === "reviewer" ? 401 : 402 },
  };
}

async function prepareSourceRelease(f, { env = {}, staged = false } = {}) {
  if (!staged) assert.equal(run(f, "stage", env).status, 0);
  const sourceSha = env.RELEASE_SHA || f.merge;
  if (sourceSha !== f.merge) {
    const api = JSON.parse(await readFile(f.statePath, "utf8"));
    const ciRun = { ...api.runs[77], head_sha: sourceSha };
    await updateApi(f, {
      ciRuns: [ciRun],
      runs: { ...api.runs, 77: ciRun },
      jobs: {
        ...api.jobs,
        77: ["Test", "Integration"].map((name, index) =>
          ciScopeJob(f.git, 601 + index, name, sourceSha),
        ),
      },
    });
  }
  const result = run(f, "record-source-qa", env);
  assert.equal(result.status, 0, result.stderr);
  return { sourceSha, env };
}

async function prepareAcceptedRelease(f, options = {}) {
  const { env = {} } = options;
  const source = await prepareSourceRelease(f, options);
  const accepted = path.join(f.root, "accepted.json");
  const result = run(f, "record-recovery-evidence", {
    ...env,
    RELEASE_ACCEPTED_STATE_FILE: accepted,
  });
  assert.equal(result.status, 0, result.stderr);
  return { ...source, accepted };
}

async function prepareFinalRelease(f) {
  const accepted = await prepareAcceptedRelease(f);
  await updateApi(f, { alias: "dpl_cand" });
  const api = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    jobs: {
      ...api.jobs,
      9: [
        ...api.jobs[9],
        workflowJob(504, "Accept production QA", "in_progress", null),
        workflowJob(505, "Accept production smoke", "completed", "skipped"),
      ],
    },
    approvals: { ...api.approvals, 9: [...api.approvals[9], approval("qa")] },
  });
  const finalState = path.join(f.root, "release-final-state.json");
  const result = run(f, "record-production-qa", {
    RELEASE_STATE_FILE: accepted.accepted,
    RELEASE_FINAL_STATE_FILE: finalState,
    GITHUB_JOB: "production-acceptance",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    JSON.parse(await readFile(finalState, "utf8")).productionQA.approval
      .githubJob,
    "production-acceptance",
  );
  return { ...accepted, finalState };
}

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
    persistedContractPath: "src/app/(tabs)/teams/page.tsx",
  });
  const source = await prepareSourceRelease(f);
  const result = run(f, "record-recovery-evidence", {
    ...source.env,
    RELEASE_ACCEPTED_STATE_FILE: path.join(f.root, "unclassified.json"),
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Cannot classify changed paths/);
  assert.match(result.stderr, /src\/app\/\(tabs\)\/teams\/page\.tsx/);
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

function hotfixAuthorization(f, current) {
  return {
    pr: {
      number: 2,
      state: "open",
      merged: false,
      draft: false,
      title: "fix: repair production",
      base: {
        ref: "main",
        sha: f.merge,
        repo: { full_name: "owner/repo" },
      },
      head: {
        ref: "hotfix/urgent",
        sha: f.hotfix,
        repo: { full_name: "owner/repo" },
      },
    },
    checks: [
      {
        ...current.checks[0],
        head_sha: f.hotfix,
      },
    ],
    statuses: [
      {
        ...current.statuses[0],
        url: `https://api.github.com/repos/owner/repo/statuses/${f.hotfix}`,
      },
    ],
    alias: "dpl_base",
    baselineSha: f.deployed,
  };
}

test("hotfix authorization binds owner dispatch to an exact isolated PR without human approval", async (t) => {
  const f = await fixture(t);
  const current = JSON.parse(await readFile(f.statePath, "utf8"));
  const valid = { ...current, ...hotfixAuthorization(f, current) };
  await writeFile(f.statePath, JSON.stringify(valid));
  const env = {
    HOTFIX_PR_NUMBER: "2",
    RELEASE_SHA: f.hotfix,
    RELEASE_OWNER_LOGIN: "release-owner",
    GITHUB_ACTOR: "release-owner",
    GITHUB_TRIGGERING_ACTOR: "release-owner",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_REF: "refs/heads/main",
  };
  let result = run(f, "authorize-hotfix", env);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).authorization, {
    owner: "release-owner",
    runId: "9",
    pullRequest: "2",
    sha: f.hotfix,
    mode: "hotfix",
  });

  const failures = [
    {
      name: "wrong explicit SHA",
      env: { ...env, RELEASE_SHA: f.head },
    },
    ...[
      ["missing owner", "RELEASE_OWNER_LOGIN", ""],
      ["outsider dispatch", "GITHUB_ACTOR", "outsider"],
      ["outsider rerun", "GITHUB_TRIGGERING_ACTOR", "outsider"],
      ["missing rerun actor", "GITHUB_TRIGGERING_ACTOR", ""],
      ["untrusted ref", "GITHUB_REF", "refs/heads/hotfix/urgent"],
      ["wrong event", "GITHUB_EVENT_NAME", "push"],
    ].map(([name, key, value]) => ({
      name,
      env: { ...env, [key]: value },
      reason: /Missing required environment value|release owner dispatch/,
    })),
    {
      name: "fork head",
      state: {
        pr: {
          ...valid.pr,
          head: {
            ...valid.pr.head,
            repo: { full_name: "outside/repo" },
          },
        },
      },
    },
    {
      name: "closed PR",
      state: { pr: { ...valid.pr, state: "closed" } },
    },
    {
      name: "draft PR",
      state: { pr: { ...valid.pr, draft: true } },
    },
    {
      name: "merged PR",
      state: { pr: { ...valid.pr, merged: true } },
    },
    {
      name: "non-hotfix branch",
      state: {
        pr: { ...valid.pr, head: { ...valid.pr.head, ref: "feat/repair" } },
      },
    },
    {
      name: "check from wrong SHA",
      state: { checks: [{ ...valid.checks[0], head_sha: f.merge }] },
    },
    {
      name: "newer failed check",
      state: {
        checks: [
          ...valid.checks,
          {
            ...valid.checks[0],
            conclusion: "failure",
            started_at: "2026-10-02T00:00:00Z",
          },
        ],
      },
    },
    {
      name: "repair from wrong deployed base",
      state: { baselineSha: f.head },
    },
    {
      name: "head includes unreleased integration history",
      env: { ...env, RELEASE_SHA: f.merge },
      state: {
        pr: { ...valid.pr, head: { ...valid.pr.head, sha: f.merge } },
        checks: [{ ...valid.checks[0], head_sha: f.merge }],
        statuses: [
          {
            ...valid.statuses[0],
            url: `https://api.github.com/repos/owner/repo/statuses/${f.merge}`,
          },
        ],
      },
      reason: /unreleased integration history/,
    },
  ];
  for (const failure of failures) {
    await writeFile(
      f.statePath,
      JSON.stringify({ ...valid, ...(failure.state || {}) }),
    );
    result = run(f, "authorize-hotfix", failure.env || env);
    assert.notEqual(result.status, 0, failure.name);
    if (failure.reason) assert.match(result.stderr, failure.reason);
  }
});

test("hotfix state rejects partial reruns by another actor before any release write", async (t) => {
  const f = await fixture(t, {
    hotfixPath: "docs/repair.md",
    hotfixDependency: "1.0.0",
  });
  const current = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, hotfixAuthorization(f, current));
  const env = {
    HOTFIX_PR_NUMBER: "2",
    RELEASE_SHA: f.hotfix,
    RELEASE_MODE: "hotfix",
    GITHUB_EVENT_NAME: "workflow_dispatch",
  };
  const authorized = run(f, "authorize-hotfix", env);
  assert.equal(authorized.status, 0, authorized.stderr);
  const authorization = JSON.parse(authorized.stdout).authorization;
  f.git(["checkout", f.hotfix]);
  const missing = run(f, "stage", env);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /authorization does not match/);
  assert.deepEqual(JSON.parse(await readFile(f.statePath, "utf8")).calls, []);
  const staged = run(f, "stage", {
    ...env,
    RELEASE_AUTHORIZATION: JSON.stringify(authorization),
  });
  assert.equal(staged.status, 0, staged.stderr);
  const state = JSON.parse(await readFile(f.env.RELEASE_STATE_FILE, "utf8"));
  assert.deepEqual(state.authorization, authorization);
  const calls = JSON.parse(await readFile(f.statePath, "utf8")).calls;
  for (const action of [
    "record-recovery-evidence",
    "promote",
    "rollback-if-compatible",
    "finalize",
    "merge-back",
  ]) {
    const denied = run(f, action, {
      ...env,
      GITHUB_TRIGGERING_ACTOR: "outsider",
    });
    assert.notEqual(denied.status, 0, action);
    assert.match(denied.stderr, /release owner dispatch/);
    assert.deepEqual(
      JSON.parse(await readFile(f.statePath, "utf8")).calls,
      calls,
    );
  }
  const { accepted } = await prepareAcceptedRelease(f, {
    env,
    staged: true,
  });
  const promoted = run(f, "promote", {
    ...env,
    RELEASE_STATE_FILE: accepted,
  });
  assert.equal(promoted.status, 0, promoted.stderr);
});

test("source QA reuses successful PR CI on equal full trees, not equal commit SHAs", async (t) => {
  const f = await fixture(t);
  assert.equal(run(f, "stage").status, 0);
  await writeFile(f.env.GITHUB_OUTPUT, "");
  const api = JSON.parse(await readFile(f.statePath, "utf8"));
  const ciRun = {
    id: 77,
    path: ".github/workflows/ci.yml@refs/heads/main",
    workflow_id: 42,
    event: "pull_request",
    head_sha: f.head,
    run_attempt: 1,
    status: "completed",
    conclusion: "failure",
    repository: { id: 101, full_name: "owner/repo" },
    head_repository: { id: 101, full_name: "owner/repo" },
  };
  await updateApi(f, {
    ciRuns: [ciRun],
    runs: { ...api.runs, 77: ciRun },
    jobs: {
      ...api.jobs,
      77: [
        ciScopeJob(f.git, 601, "Test", f.head),
        ciScopeJob(f.git, 602, "Integration", f.head),
      ],
    },
  });
  let result = run(f, "record-source-qa");
  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(await readFile(f.env.RELEASE_STATE_FILE, "utf8"));
  assert.equal(receipt.sourceQA.scopes.unit.kind, "ci-reuse");
  assert.equal(receipt.sourceQA.scopes.integration.kind, "ci-reuse");

  for (const marker of [
    `Source tree ${f.git(["rev-parse", `${f.deployed}^{tree}`])} at ${f.deployed}`,
    `Source tree ${f.git(["rev-parse", `${f.merge}^{tree}`])} at ${f.deployed}`,
  ]) {
    const current = JSON.parse(await readFile(f.statePath, "utf8"));
    await updateApi(f, {
      jobs: {
        ...current.jobs,
        77: current.jobs[77].map((job) => ({
          ...job,
          steps: [
            job.steps.find((step) =>
              step.name.startsWith("Producer workflow "),
            ),
            { name: marker, status: "completed", conclusion: "success" },
          ],
        })),
      },
    });
    const denied = run(f, "record-source-qa");
    assert.notEqual(denied.status, 0);
    assert.match(denied.stderr, /trusted CI evidence/);
  }
  const valid = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    jobs: {
      ...valid.jobs,
      77: ["Test", "Integration"].map((name, index) =>
        ciScopeJob(f.git, 601 + index, name, f.head),
      ),
    },
  });

  const untrusted = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    workflowBlobs: { ...untrusted.workflowBlobs, [f.head]: "b".repeat(40) },
  });
  await writeFile(f.env.GITHUB_OUTPUT, "");
  result = run(f, "record-source-qa");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /trusted CI evidence/);
});

test("source QA fails when unit or integration CI evidence is missing", async (t) => {
  const f = await fixture(t);
  assert.equal(run(f, "stage").status, 0);
  const api = JSON.parse(await readFile(f.statePath, "utf8"));
  for (const missing of ["Test", "Integration"]) {
    await updateApi(f, {
      jobs: {
        ...api.jobs,
        77: api.jobs[77].filter((job) => job.name !== missing),
      },
    });
    const denied = run(f, "record-source-qa");
    assert.notEqual(denied.status, 0, missing);
    assert.match(denied.stderr, /trusted CI evidence/);
  }
});

test("owner CI correction proves an unchanged old application tree with the trusted new workflow", async (t) => {
  const f = await fixture(t);
  assert.equal(run(f, "stage").status, 0);
  const api = JSON.parse(await readFile(f.statePath, "utf8"));
  const ciRun = {
    ...api.runs[77],
    head_sha: f.deployed,
    head_branch: "main",
    actor: { login: "release-owner" },
    triggering_actor: { login: "release-owner" },
  };
  const jobs = api.jobs[77].map((job) => ({
    ...job,
    steps: job.steps.map((step) =>
      step.name.startsWith("Producer workflow ")
        ? { ...step, name: `Producer workflow ${f.deployed}` }
        : step,
    ),
  }));
  await updateApi(f, {
    ciRuns: [ciRun],
    runs: { ...api.runs, 77: ciRun },
    jobs: { ...api.jobs, 77: jobs },
    workflowBlobs: { ...api.workflowBlobs, [f.merge]: "b".repeat(40) },
  });
  const staged = await readFile(f.env.RELEASE_STATE_FILE, "utf8");
  let result = run(f, "record-source-qa");
  assert.equal(result.status, 0, result.stderr);
  const state = JSON.parse(await readFile(f.env.RELEASE_STATE_FILE, "utf8"));
  assert.equal(state.sha, f.merge);
  assert.equal(state.sourceQA.scopes.unit.testedSha, f.merge);
  assert.equal(state.sourceQA.scopes.unit.producerSha, f.deployed);
  for (const invalid of [
    { ...ciRun, head_branch: "foreign" },
    { ...ciRun, triggering_actor: { login: "outsider" } },
  ]) {
    await updateApi(f, {
      ciRuns: [invalid],
      runs: { ...api.runs, 77: invalid },
    });
    await writeFile(f.env.RELEASE_STATE_FILE, staged);
    result = run(f, "record-source-qa");
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /owner-dispatched/);
  }
});

test("owner recovery accepts only the original nonexpired proven artifact", async (t) => {
  const f = await fixture(t);
  const { accepted } = await prepareAcceptedRelease(f);
  await updateApi(f, { alias: "dpl_cand" });
  const artifactDirectory = path.join(f.root, "artifact");
  const stateFile = path.join(artifactDirectory, "release-state.json");
  const archive = path.join(f.root, "accepted.zip");
  await mkdir(artifactDirectory);
  await writeFile(stateFile, await readFile(accepted));
  execFileSync("zip", ["-q", "-j", archive, stateFile]);
  const digest = createHash("sha256")
    .update(await readFile(archive))
    .digest("hex");
  const api = JSON.parse(await readFile(f.statePath, "utf8"));
  const currentRun = {
    id: 10,
    path: ".github/workflows/production-release.yml@refs/heads/main",
    event: "workflow_dispatch",
    head_branch: "main",
    head_sha: f.merge,
    run_attempt: 1,
    status: "in_progress",
    repository: { id: 101, full_name: "owner/repo" },
    head_repository: { id: 101, full_name: "owner/repo" },
    actor: { login: "release-owner", id: 201 },
    triggering_actor: { login: "release-owner", id: 201 },
  };
  const artifact = {
    id: 700,
    name: "production-release-accepted-state",
    expired: true,
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
  };
  await updateApi(f, {
    runs: { ...api.runs, 10: currentRun },
    artifacts: { ...api.artifacts, 9: [artifact] },
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
  let result = run(f, "recover-verify", {
    ...recoveryEnv,
    GITHUB_ACTOR: "outsider",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /release owner dispatch/);
  result = run(f, "recover-verify", recoveryEnv);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expired|provenance/);
  await updateApi(f, {
    artifacts: {
      ...api.artifacts,
      9: [
        {
          ...artifact,
          expired: false,
          workflow_run: { ...artifact.workflow_run, repository_id: 999 },
        },
      ],
    },
  });
  result = run(f, "recover-verify", recoveryEnv);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /provenance/);
  await updateApi(f, {
    artifacts: {
      ...api.artifacts,
      9: [{ ...artifact, expired: false, expires_at: "not-a-date" }],
    },
  });
  result = run(f, "recover-verify", recoveryEnv);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expired|provenance/);

  let current = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    artifacts: { ...current.artifacts, 9: [{ ...artifact, expired: false }] },
    jobs: {
      ...current.jobs,
      9: [...current.jobs[9], workflowJob(699, "finalize-release")],
    },
  });
  result = run(f, "recover-verify", recoveryEnv);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /passed production QA|finalized/);

  current = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    jobs: {
      ...current.jobs,
      9: [
        ...current.jobs[9].filter((job) => job.name !== "finalize-release"),
        workflowJob(698, "Accept production QA"),
      ],
    },
  });
  result = run(f, "recover-verify", recoveryEnv);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /passed production QA/);

  current = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    jobs: {
      ...current.jobs,
      9: [
        ...current.jobs[9].filter((job) => job.name !== "Accept production QA"),
        workflowJob(697, "Accept production smoke"),
      ],
    },
  });
  result = run(f, "recover-verify", recoveryEnv);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /passed production QA/);

  current = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    jobs: {
      ...current.jobs,
      9: current.jobs[9].filter(
        (job) =>
          !["finalize-release", "Accept production smoke"].includes(job.name),
      ),
    },
    candidate: { readyState: "CANCELED" },
  });
  result = run(f, "recover-verify", recoveryEnv);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /deployment|readiness|live alias/i);
  await updateApi(f, { candidate: undefined });

  result = run(f, "recover-verify", recoveryEnv);
  assert.equal(result.status, 0, result.stderr);

  const currentBeforeLegacy = JSON.parse(await readFile(f.statePath, "utf8"));
  const currentArtifact = currentBeforeLegacy.artifacts[9][0];
  const currentState = await readFile(stateFile);
  const legacyState = JSON.parse(currentState.toString("utf8"));
  legacyState.stateVersion = 3;
  await writeFile(stateFile, JSON.stringify(legacyState));
  await rm(archive, { force: true });
  execFileSync("zip", ["-q", "-j", archive, stateFile]);
  const legacyDigest = createHash("sha256")
    .update(await readFile(archive))
    .digest("hex");
  await updateApi(f, {
    artifacts: {
      ...currentBeforeLegacy.artifacts,
      9: [{ ...currentArtifact, digest: `sha256:${legacyDigest}` }],
    },
  });
  result = run(f, "recover-verify", recoveryEnv);
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /Legacy release artifacts require a fresh authorized release run/,
  );

  await writeFile(stateFile, currentState);
  await rm(archive, { force: true });
  execFileSync("zip", ["-q", "-j", archive, stateFile]);
  const restoredDigest = createHash("sha256")
    .update(await readFile(archive))
    .digest("hex");
  await updateApi(f, {
    artifacts: {
      ...currentBeforeLegacy.artifacts,
      9: [{ ...currentArtifact, digest: `sha256:${restoredDigest}` }],
    },
  });
  const pushState = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    runs: {
      ...pushState.runs,
      9: { ...pushState.runs[9], event: "pull_request" },
    },
  });
  result = run(f, "recover-verify", recoveryEnv);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Original automatic release authorization/);
  await updateApi(f, { runs: pushState.runs });
  result = run(f, "recover-verify", recoveryEnv);
  assert.equal(result.status, 0, result.stderr);
  const recovered = JSON.parse(await readFile(recovery, "utf8"));
  assert.deepEqual(recovered.recovery, {
    verified: true,
    owner: "release-owner",
    runId: "10",
    runAttempt: "1",
    originalRunId: "9",
  });
  result = run(f, "rollback-if-compatible", {
    ...recoveryEnv,
    RELEASE_STATE_FILE: recovery,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    JSON.parse(await readFile(f.statePath, "utf8")).alias,
    "dpl_base",
  );
});

test("hotfix authorization rejects a non-patch version", async (t) => {
  const f = await fixture(t);
  const current = JSON.parse(await readFile(f.statePath, "utf8"));
  f.git(["checkout", "-b", "hotfix/wrong-version", f.deployed]);
  await writeFile(
    path.join(f.repo, "package.json"),
    `${JSON.stringify({ name: "fixture", version: "1.1.0" }, null, 2)}\n`,
  );
  await writeFile(
    path.join(f.repo, "CHANGELOG.md"),
    "# Changes\n\n## [1.1.0]\n\n- Wrong bump\n",
  );
  f.git(["add", "package.json", "CHANGELOG.md"]);
  f.git(["commit", "-m", "wrong version"]);
  const wrong = f.git(["rev-parse", "HEAD"]);
  f.git(["checkout", "main"]);
  const state = hotfixAuthorization(f, current);
  state.pr = {
    ...state.pr,
    head: { ...state.pr.head, ref: "hotfix/wrong-version", sha: wrong },
  };
  state.checks = [{ ...state.checks[0], head_sha: wrong }];
  state.statuses = [
    {
      ...state.statuses[0],
      url: `https://api.github.com/repos/owner/repo/statuses/${wrong}`,
    },
  ];
  await updateApi(f, state);
  const result = run(f, "authorize-hotfix", {
    HOTFIX_PR_NUMBER: "2",
    RELEASE_SHA: wrong,
    GITHUB_EVENT_NAME: "workflow_dispatch",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /one patch above/);
});

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
    {
      statuses: [
        {
          ...original.statuses[0],
          url: `https://api.github.com/repos/owner/repo/statuses/${f.merge}`,
        },
      ],
    },
    {
      statuses: [
        {
          ...original.statuses[0],
          url: `https://api.github.com/repos/attacker/repo/statuses/${f.head}`,
        },
      ],
    },
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
    { pr: { ...original.pr, title: "release: something else" } },
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
  const result = run(f, "authorize", { GITHUB_SHA: invalid });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /non-metadata change/);
});

async function outputOf(f) {
  return readFile(f.env.GITHUB_OUTPUT, "utf8").catch(() => "");
}

test("owner merge of the version PR authorizes the exact push SHA", async (t) => {
  const f = await fixture(t);
  const result = run(f, "authorize");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).sha, f.merge);
  assert.match(await outputOf(f), new RegExp(`^sha=${f.merge}$`, "m"));
});

test("a push that merged an ordinary PR ends without a release", async (t) => {
  const f = await fixture(t);
  const { pr } = JSON.parse(await readFile(f.statePath, "utf8"));
  for (const other of [
    { ...pr, head: { ...pr.head, ref: "hotfix-merge-back/1" } },
    { ...pr, head: { ...pr.head, repo: { full_name: "attacker/repo" } } },
  ]) {
    await writeFile(f.env.GITHUB_OUTPUT, "");
    await updateApi(f, {
      commitPulls: [{ ...other, merged_at: "2026-10-01" }],
    });
    const result = run(f, "authorize", { GITHUB_ACTOR: "someone-else" });
    assert.equal(result.status, 0, result.stderr);
    const output = await outputOf(f);
    assert.match(output, /^release=false$/m);
    assert.doesNotMatch(output, /sha=|release_authorization/);
  }
});

test("a merge commit with no matching merged PR cannot authorize and tells the owner to dispatch", async (t) => {
  const f = await fixture(t);
  const { pr } = JSON.parse(await readFile(f.statePath, "utf8"));
  for (const commitPulls of [
    [],
    [{ ...pr, merge_commit_sha: f.head, merged_at: "2026-10-01" }],
    [{ ...pr, merged_at: null }],
  ]) {
    await updateApi(f, { commitPulls, pullLookups: 0 });
    const result = run(f, "authorize");
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /normal-retry/);
    assert.doesNotMatch(await outputOf(f), /sha=|release=/);
    if (!commitPulls.length)
      assert.ok(
        JSON.parse(await readFile(f.statePath, "utf8")).pullLookups > 1,
      );
  }
});

test("a PR that GitHub has not indexed yet is found on a later lookup", async (t) => {
  const f = await fixture(t);
  await updateApi(f, { emptyLookups: 3 });
  const result = run(f, "authorize");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(await readFile(f.statePath, "utf8")).pullLookups, 4);
});

test("only the release owner's merge push on main starts a release", async (t) => {
  const f = await fixture(t);
  for (const [override, message] of [
    [{ GITHUB_ACTOR: "someone-else" }, /release owner's merge.*normal-retry/],
    [
      { GITHUB_TRIGGERING_ACTOR: "someone-else" },
      /release owner's merge.*normal-retry/,
    ],
    [{ GITHUB_EVENT_NAME: "workflow_dispatch" }, /only starts from a push/],
    [{ GITHUB_REF: "refs/heads/x" }, /only starts from a push/],
  ]) {
    const result = run(f, "authorize", override);
    assert.notEqual(result.status, 0, JSON.stringify(override));
    assert.match(result.stderr, message, JSON.stringify(override));
    assert.doesNotMatch(await outputOf(f), /sha=/);
  }
});

test("several merged PRs for one push fail instead of guessing", async (t) => {
  const f = await fixture(t);
  const { pr } = JSON.parse(await readFile(f.statePath, "utf8"));
  const merged = { ...pr, merged_at: "2026-10-01" };
  await updateApi(f, { commitPulls: [merged, { ...merged, number: 2 }] });
  const result = run(f, "authorize");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /more than one/i);
  assert.doesNotMatch(await outputOf(f), /sha=/);
});

test("a multi-commit version PR rebase merge fails closed while a single-commit landing authorizes", async (t) => {
  const f = await fixture(t);
  const rebased = { ...JSON.parse(await readFile(f.statePath, "utf8")).pr };
  const landed = { ...rebased, merge_commit_sha: f.head };
  await updateApi(f, { pr: landed });
  const env = { GITHUB_SHA: f.head };
  const parent = f.git(["rev-parse", `${f.head}^1`]);
  // squash or single-commit rebase: the push holds exactly one commit
  await writeFile(
    f.eventPath,
    JSON.stringify({ before: parent, after: f.head }),
  );
  assert.equal(run(f, "authorize", env).status, 0);
  // rebase of several commits: the push holds more than one commit
  await writeFile(
    f.eventPath,
    JSON.stringify({ before: f.deployed, after: f.head }),
  );
  const result = run(f, "authorize", env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /rebase/i);
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

test("normal staging rejects a candidate that omits the deployed hotfix ancestry", async (t) => {
  const f = await fixture(t);
  await updateApi(f, {
    alias: "dpl_hotfix",
    baselineSha: f.hotfix,
    deploymentShas: { dpl_hotfix: f.hotfix },
  });
  const result = run(f, "stage");
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /does not contain the deployed production source/,
  );
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

async function classifyDiff(t, before, after) {
  const root = await mkdtemp(path.join(os.tmpdir(), "release-classify-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  git(["init", "-b", "main"]);
  git(["config", "user.email", "test@example.invalid"]);
  git(["config", "user.name", "Test"]);
  const commit = async (files) => {
    for (const [file, content] of Object.entries(files)) {
      await mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await writeFile(path.join(root, file), content);
    }
    git(["add", "."]);
    git(["commit", "-m", "c", "--allow-empty"]);
    return git(["rev-parse", "HEAD"]);
  };
  const baseline = await commit(before);
  const sha = await commit(after);
  const prev = process.cwd();
  process.chdir(root);
  try {
    return await persistedContractChanges({ baseline: { sha: baseline }, sha });
  } finally {
    process.chdir(prev);
  }
}

const json = (value) => `${JSON.stringify(value)}\n`;

test("tooling-only paths are unrelated to production data", async (t) => {
  const paths = [
    ".agents/skills/x/SKILL.md",
    ".claude/settings.json",
    ".storybook/main.ts",
    ".husky/pre-commit",
    "AGENTS.md",
    "CLAUDE.md",
    "DESIGN.md",
    "skills-lock.json",
    "commitlint.config.js",
    "commitlint.title.config.js",
    "playwright.config.ts",
    ".worktreeinclude",
    ".markdownlint.jsonc",
    ".nvmrc",
  ];
  const result = await classifyDiff(
    t,
    { "a.txt": "1" },
    Object.fromEntries(paths.map((p) => [p, "x"])),
  );
  assert.deepEqual(result.unclassifiedPaths, []);
  assert.deepEqual(result.contractPaths, []);
});

test("pnpm-workspace.yaml stays a persisted contract path", async (t) => {
  const result = await classifyDiff(
    t,
    { "a.txt": "1" },
    { "pnpm-workspace.yaml": "x" },
  );
  assert.deepEqual(result.contractPaths, ["pnpm-workspace.yaml"]);
});

test("vercel.json is unrelated only when just the git key changed", async (t) => {
  const base = {
    git: { deploymentEnabled: { main: false, b: false } },
    crons: [],
  };
  const git = await classifyDiff(
    t,
    { "vercel.json": json(base) },
    {
      "vercel.json": json({
        ...base,
        git: { deploymentEnabled: { main: false } },
      }),
    },
  );
  assert.deepEqual(git.unclassifiedPaths, []);
  const other = await classifyDiff(
    t,
    { "vercel.json": json(base) },
    {
      "vercel.json": json({
        ...base,
        crons: [{ path: "/x", schedule: "* * * * *" }],
      }),
    },
  );
  assert.deepEqual(other.unclassifiedPaths, ["vercel.json"]);
});

test("package.json scripts and packageManager changes are unrelated; unknown keys are not", async (t) => {
  const base = {
    version: "1.0.0",
    scripts: { a: "a" },
    packageManager: "pnpm@9.0.0",
  };
  const tooling = await classifyDiff(
    t,
    { "package.json": json(base) },
    {
      "package.json": json({
        version: "1.0.1",
        scripts: { a: "a", b: "b" },
        packageManager: "pnpm@10.0.0",
      }),
    },
  );
  assert.deepEqual(tooling.unclassifiedPaths, []);
  assert.deepEqual(tooling.contractPaths, []);
  const unknown = await classifyDiff(
    t,
    { "package.json": json(base) },
    { "package.json": json({ ...base, engines: { node: "22" } }) },
  );
  assert.deepEqual(unknown.unclassifiedPaths, ["package.json"]);
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
        workflowJob(801, "Production smoke"),
        workflowJob(802, "Classify production smoke"),
        workflowJob(504, "Accept production QA", "completed", "skipped"),
        workflowJob(803, "Accept production smoke", "in_progress", null),
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

async function outputsOf(f) {
  const text = await readFile(f.env.GITHUB_OUTPUT, "utf8");
  return Object.fromEntries(
    text
      .trim()
      .split("\n")
      .map((line) => [
        line.slice(0, line.indexOf("=")),
        line.slice(line.indexOf("=") + 1),
      ]),
  );
}

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
      ["801", "Production smoke"],
      ["802", "Classify production smoke"],
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
    "Accept production smoke": { status: "completed", conclusion: "success" },
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
  await setJobs(f, { "Classify production smoke": { conclusion: "failure" } });
  assert.notEqual(finalizeWith().status, 0);
  await setJobs(f, { "Classify production smoke": { conclusion: "success" } });
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
      "Accept production QA": { conclusion: qa },
      "Accept production smoke": { conclusion: auto },
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
      "Accept production QA": { status: "completed", conclusion: qa },
      "Accept production smoke": { conclusion: auto },
    });
    assert.notEqual(
      run(human, "finalize", { RELEASE_STATE_FILE: finalState }).status,
      0,
      `${qa}/${auto}`,
    );
  }
  await setJobs(human, {
    "Accept production QA": { conclusion: "success" },
    "Accept production smoke": { conclusion: "skipped" },
  });
  const accepted = run(human, "finalize", { RELEASE_STATE_FILE: finalState });
  assert.equal(accepted.status, 0, accepted.stderr);
});

const workflowDir = new URL("../../.github/workflows/", import.meta.url);
const loadWorkflow = async (name) =>
  parseYaml(await readFile(new URL(name, workflowDir), "utf8"));

// Evaluates the `needs`-only subset of GitHub expressions used by job `if` conditions.
function evalIf(expression, needs) {
  const needsContext = Object.fromEntries(
    Object.entries(needs).map(([id, { result, outputs = {} }]) => [
      id,
      {
        result,
        outputs: new Proxy(outputs, { get: (o, key) => o[key] ?? "" }),
      },
    ]),
  );
  const js = String(expression)
    .replace(/needs\.([\w-]+)\./g, (_, id) => `needs["${id}"].`)
    .replace(/always\(\)/g, "true")
    .replace(/cancelled\(\)/g, "false");
  return new Function("needs", `return (${js});`)(needsContext);
}

test("production release routes each smoke outcome to exactly one path", async () => {
  const { jobs } = await loadWorkflow("production-release.yml");
  const classify = (outcome, auto_accept = "false") => ({
    candidate: { result: "success" },
    "promote-and-smoke": { result: "success" },
    "production-smoke": { result: "success" },
    "classify-production-smoke": {
      result: "success",
      outputs: { outcome, auto_accept },
    },
    "production-acceptance": { result: "skipped" },
    "accept-production-smoke": { result: "skipped" },
  });
  const runs = (needs) =>
    [
      "recover-after-production-qa-failure",
      "production-acceptance",
      "accept-production-smoke",
    ].filter((id) => evalIf(jobs[id].if, needs));
  assert.deepEqual(runs(classify("regression")), [
    "recover-after-production-qa-failure",
  ]);
  assert.deepEqual(runs(classify("infrastructure")), ["production-acceptance"]);
  assert.deepEqual(runs(classify("pass", "false")), ["production-acceptance"]);
  assert.deepEqual(runs(classify("pass", "true")), ["accept-production-smoke"]);
  // A failed classification is undeterminable: human gate, never auto-accept or rollback.
  assert.deepEqual(
    runs({
      ...classify("pass", "true"),
      "classify-production-smoke": { result: "failure" },
    }),
    ["production-acceptance"],
  );
  // Classification still runs after a promote when the smoke job failed or was skipped.
  const classifies = (promote, smoke) =>
    evalIf(jobs["classify-production-smoke"].if, {
      candidate: { result: "success" },
      "promote-and-smoke": { result: promote },
      "production-smoke": { result: smoke },
    });
  for (const smoke of ["success", "failure", "skipped"])
    assert.equal(classifies("success", smoke), true);
  assert.equal(classifies("failure", "skipped"), false);
  // A failed human gate still rolls back; a skipped one does not.
  const gate = (result) => ({
    ...classify("pass", "false"),
    "production-acceptance": { result },
  });
  const recover = jobs["recover-after-production-qa-failure"].if;
  assert.equal(evalIf(recover, gate("failure")), true);
  assert.equal(evalIf(recover, gate("success")), false);
  assert.equal(evalIf(recover, gate("skipped")), false);
});

test("finalize needs both acceptance jobs and runs only when exactly one succeeded", async () => {
  const { jobs } = await loadWorkflow("production-release.yml");
  const job = jobs["finalize-release"];
  assert.ok(job.needs.includes("production-acceptance"));
  assert.ok(job.needs.includes("accept-production-smoke"));
  const finalize = (human, smoke) =>
    evalIf(job.if, {
      candidate: { result: "success" },
      "production-acceptance": { result: human },
      "accept-production-smoke": { result: smoke },
    });
  assert.equal(finalize("success", "skipped"), true);
  assert.equal(finalize("skipped", "success"), true);
  assert.equal(finalize("success", "success"), false);
  assert.equal(finalize("skipped", "skipped"), false);
  assert.equal(finalize("failure", "skipped"), false);
  assert.equal(finalize("skipped", "failure"), false);
  for (const id of ["production-acceptance", "accept-production-smoke"]) {
    const upload = jobs[id].steps.find((step) =>
      step.uses?.startsWith("actions/upload-artifact"),
    );
    assert.equal(upload.with.name, "production-release-final-state");
    assert.equal(upload.with["retention-days"], 31);
  }
});

test("every job referenced by a condition or output is declared in needs", async () => {
  const { jobs } = await loadWorkflow("production-release.yml");
  for (const [id, job] of Object.entries(jobs)) {
    const used = new Set(
      [
        ...JSON.stringify({ ...job, needs: undefined }).matchAll(
          /needs\.([\w-]+)\./g,
        ),
      ].map((match) => match[1]),
    );
    for (const dep of used)
      assert.ok([].concat(job.needs ?? []).includes(dep), `${id} uses ${dep}`);
  }
  const summary = jobs["failure-summary"].needs;
  for (const id of Object.keys(jobs).filter((id) => id !== "failure-summary"))
    assert.ok(summary.includes(id), `failure-summary needs ${id}`);
});

test("jobs in the production-smoke environment hold no artifact, deploy token or credentials", async () => {
  let checked = 0;
  for (const file of [
    "production-release.yml",
    "production-smoke-keepalive.yml",
  ]) {
    const workflow = await loadWorkflow(file);
    for (const [id, job] of Object.entries(workflow.jobs)) {
      if ((job.environment?.name ?? job.environment) !== "production-smoke")
        continue;
      checked += 1;
      const text = JSON.stringify(job);
      const where = `${file}:${id}`;
      assert.doesNotMatch(text, /upload-artifact/, where);
      assert.doesNotMatch(
        text,
        /VERCEL_TOKEN|GH_TOKEN|github\.token|RELEASE_TOKEN/,
        where,
      );
      assert.equal(job.concurrency, undefined, where);
      assert.ok(
        Object.keys(job.permissions ?? {}).every((k) => k === "contents"),
        where,
      );
      for (const step of job.steps.filter((s) =>
        s.uses?.startsWith("actions/checkout"),
      ))
        assert.equal(step.with?.["persist-credentials"], false, where);
    }
    assert.doesNotMatch(
      JSON.stringify(workflow.env ?? {}),
      /VERCEL_TOKEN/,
      file,
    );
  }
  assert.equal(checked, 2);
  const { jobs } = await loadWorkflow("production-release.yml");
  const checkout = jobs["production-smoke"].steps.find((s) =>
    s.uses?.startsWith("actions/checkout"),
  );
  assert.equal(checkout.with.ref, "${{ github.workflow_sha }}");
  const cookieMask = jobs["production-smoke"].steps.findIndex((s) =>
    s.run?.includes("::add-mask::"),
  );
  const smoke = jobs["production-smoke"].steps.findIndex(
    (s) => s.id === "smoke",
  );
  assert.ok(cookieMask >= 0 && cookieMask < smoke);
  assert.equal(
    jobs["production-smoke"].steps[smoke]["continue-on-error"],
    true,
  );
  assert.ok(
    jobs["classify-production-smoke"].steps.some((s) =>
      JSON.stringify(s).includes("VERCEL_TOKEN"),
    ),
  );
});

const stepsOf = (job) => job.steps ?? [];
const checkouts = (job) =>
  stepsOf(job).filter((s) => s.uses?.startsWith("actions/checkout"));
const downloads = (job) =>
  stepsOf(job).filter((s) => s.uses?.startsWith("actions/download-artifact"));

// A trusted controller job may read candidate git history but never candidate
// code, and takes its Node runtime from trusted main.
const assertCandidateHistoryOnly = (job) => {
  assert.doesNotMatch(JSON.stringify(job), /pnpm/);
  for (const step of checkouts(job)) {
    assert.equal(step.with["persist-credentials"], false);
    assert.equal(step.with["sparse-checkout"], ".nvmrc");
  }
  const nodeSetups = stepsOf(job).filter((s) =>
    s.uses?.startsWith("actions/setup-node"),
  );
  assert.deepEqual(
    nodeSetups.map((s) => s.with["node-version-file"]),
    ["trusted-node/.nvmrc"],
  );
  const trustedCheckout = checkouts(job).find(
    (s) => s.with.path === "trusted-node",
  );
  assert.equal(trustedCheckout.with.ref, "${{ github.workflow_sha }}");
};

test("source-qa plans the compatibility suite from candidate history without running candidate code", async () => {
  const { jobs } = await loadWorkflow("production-release.yml");
  assertCandidateHistoryOnly(jobs["source-qa"]);
});

test("recovery-receipt runs no candidate code and reads only the trusted controller, source state and one report", async () => {
  const { jobs } = await loadWorkflow("production-release.yml");
  const job = jobs["recovery-receipt"];
  assert.ok(job.needs.includes("recovery-evidence"));
  assertCandidateHistoryOnly(job);
  // The report is downloaded only when the trusted source-qa job says it is required.
  const reportDownload = downloads(job).find(
    (s) => s.with.name === "release-compatibility-report",
  );
  const needed = (required) =>
    evalIf(reportDownload.if, {
      "source-qa": {
        result: "success",
        outputs: { compatibility_required: required },
      },
    });
  assert.equal(needed("true"), true);
  assert.equal(needed("false"), false);
  assert.deepEqual(
    downloads(job)
      .map((step) => step.with.name)
      .sort(),
    [
      "production-release-source-state",
      "release-compatibility-report",
      "trusted-release-controller",
    ],
  );
  for (const step of downloads(job)) {
    assert.equal(step.with.pattern, undefined);
    assert.equal(step.with["merge-multiple"], undefined);
  }
  const trusted = downloads(job).find(
    (s) => s.with.name === "trusted-release-controller",
  );
  const runs = stepsOf(job).filter((s) => s.run);
  assert.ok(runs.length > 0);
  for (const step of runs)
    assert.match(
      step.run,
      /^node "\$RUNNER_TEMP\/trusted\/release-controls\.js"/,
    );
  assert.equal(trusted.with.path, "${{ runner.temp }}/trusted");
  const upload = stepsOf(job).find((s) =>
    s.uses?.startsWith("actions/upload-artifact"),
  );
  assert.equal(upload.with.name, "production-release-accepted-state");
});

test("recovery-evidence holds no GitHub token, runs no controller and uploads only its report", async () => {
  const { jobs } = await loadWorkflow("production-release.yml");
  const job = jobs["recovery-evidence"];
  assert.doesNotMatch(
    JSON.stringify(job),
    /GH_TOKEN|github\.token|RELEASE_TOKEN|VERCEL_TOKEN|release-controls|record-recovery-evidence|production-release-accepted-state/,
  );
  assert.deepEqual(downloads(job), []);
  assert.equal(job.permissions.actions, undefined);
  for (const step of checkouts(job))
    assert.equal(step.with["persist-credentials"], false);
  // Whether the suite runs is decided upstream by the trusted source-qa job.
  const evidence = (required, result = "success") => ({
    candidate: { result: "success" },
    "source-qa": { result, outputs: { compatibility_required: required } },
  });
  assert.equal(evalIf(job.if, evidence("true")), true);
  assert.equal(evalIf(job.if, evidence("false")), false);
  assert.equal(evalIf(job.if, evidence("true", "failure")), false);
  const receipt = (required, evidenceResult) => ({
    candidate: { result: "success" },
    "source-qa": {
      result: "success",
      outputs: { compatibility_required: required },
    },
    "recovery-evidence": { result: evidenceResult },
  });
  const gate = jobs["recovery-receipt"].if;
  assert.equal(evalIf(gate, receipt("true", "success")), true);
  assert.equal(evalIf(gate, receipt("true", "skipped")), false);
  assert.equal(evalIf(gate, receipt("true", "failure")), false);
  assert.equal(evalIf(gate, receipt("false", "skipped")), true);
  const uploads = stepsOf(job).filter((s) =>
    s.uses?.startsWith("actions/upload-artifact"),
  );
  assert.deepEqual(
    uploads.map((s) => s.with.name),
    ["release-compatibility-report"],
  );
  assert.ok(jobs["promote-and-smoke"].needs.includes("recovery-receipt"));
  assert.doesNotMatch(
    JSON.stringify(jobs["promote-and-smoke"].if),
    /recovery-evidence/,
  );
});

test("only the hotfix authorization job references VERCEL_TOKEN before staging, and only for a verified hotfix mode", async () => {
  const { jobs } = await loadWorkflow("production-release.yml");
  assert.doesNotMatch(JSON.stringify(jobs.authorize), /VERCEL_TOKEN/);
  assert.match(
    JSON.stringify(jobs["authorize-hotfix"]),
    /secrets\.VERCEL_TOKEN/,
  );
  const hotfix = (mode, result) => ({
    authorize: { result, outputs: { mode } },
  });
  assert.equal(
    evalIf(jobs["authorize-hotfix"].if, hotfix("hotfix", "success")),
    true,
  );
  for (const mode of ["normal", "normal-retry"])
    assert.equal(
      evalIf(jobs["authorize-hotfix"].if, hotfix(mode, "success")),
      false,
    );
  assert.ok(jobs["failure-summary"].needs.includes("authorize-hotfix"));

  const candidate = (mode, hotfixResult, release, hotfixRelease = "") => ({
    authorize: { result: "success", outputs: { mode, release } },
    "authorize-hotfix": {
      result: hotfixResult,
      outputs: { release: hotfixRelease },
    },
  });
  const runs = (...args) => evalIf(jobs.candidate.if, candidate(...args));
  assert.equal(runs("normal", "skipped", "true"), true);
  assert.equal(runs("normal", "skipped", "false"), false);
  // The hotfix output takes precedence over the authorize output.
  assert.equal(runs("hotfix", "success", "false", "true"), true);
  // A failed hotfix authorization stops the candidate.
  assert.equal(runs("hotfix", "failure", ""), false);
});
