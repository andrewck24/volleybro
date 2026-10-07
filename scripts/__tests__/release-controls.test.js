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
import { fileURLToPath } from "node:url";

const cli =
  process.env.RELEASE_TEST_CLI ||
  fileURLToPath(new URL("../release-controls.js", import.meta.url));

async function fixture(
  t,
  {
    persistedContract = false,
    persistedContractPath = "src/infrastructure/db/schema.ts",
    compatibilityTest = false,
    baselineCompatibilityTest = false,
    removeCompatibilityTest = false,
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
  await writeFile(path.join(repo, "CHANGELOG.md"), "# Changes\\n");
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
  git(["add", ".changeset/one.md"]);
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
    "# Changes\\n\\n## [1.0.1]\\n\\n- Release changes\\n",
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
      { name: "fixture", version: "1.0.1", dependencies: { secure: "2.0.0" } },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    path.join(repo, "CHANGELOG.md"),
    "# Changes\\n\\n## [1.0.1]\\n\\n- Release changes\\n",
  );
  await writeFile(path.join(repo, "repair.js"), "export const fixed = true;\n");
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
          event: "pull_request",
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
  if(route.includes('/pulls?'))result=s.mergeBackPr?[s.mergeBackPr]:[];
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
      PRODUCTION_DB_ACTIVE: "false",
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
      GITHUB_JOB: "recovery-evidence",
      GH_TOKEN: "test",
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_REPOSITORY: "owner/repo",
      RELEASE_BOT_LOGIN: "release-owner",
      RELEASE_OWNER_LOGIN: "release-owner",
      GITHUB_ACTOR: "release-owner",
      GITHUB_TRIGGERING_ACTOR: "release-owner",
      GITHUB_EVENT_NAME: "pull_request",
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
  assert.equal(recorded.productionDatabaseActive, false);
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

test("stage stops before deployment when release mode or database lifecycle is unknown", async (t) => {
  const f = await fixture(t);
  for (const override of [
    { RELEASE_MODE: "" },
    { RELEASE_MODE: "preview" },
    { PRODUCTION_DB_ACTIVE: "" },
    { PRODUCTION_DB_ACTIVE: "yes" },
  ]) {
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

test("legacy release state cannot bypass a fresh owner-authorized release", async (t) => {
  const f = await fixture(t);
  const { accepted } = await prepareAcceptedRelease(f);
  const state = JSON.parse(await readFile(accepted, "utf8"));
  state.stateVersion = 2;
  delete state.releaseMode;
  delete state.productionDatabaseActive;
  delete state.recoveryEvidence;
  state.recovery = {
    verified: true,
    owner: "release-owner",
    runId: "10",
    runAttempt: "1",
    originalRunId: "9",
  };
  const legacyState = path.join(f.root, "legacy-recovery.json");
  await writeFile(legacyState, JSON.stringify(state));
  await updateApi(f, { alias: "dpl_cand" });
  const callsBeforeRollback = JSON.parse(
    await readFile(f.statePath, "utf8"),
  ).calls;
  const recoveryEnv = {
    RELEASE_STATE_FILE: legacyState,
    GITHUB_RUN_ID: "10",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_REF: "refs/heads/main",
  };
  const denied = run(f, "rollback-if-compatible", recoveryEnv);
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

async function passingCompatibilityTestEnv(f, overrides = {}) {
  const api = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    jobs: {
      ...api.jobs,
      9: [
        workflowJob(
          503,
          "Verify release recovery evidence",
          "in_progress",
          null,
          [
            {
              name: "Run and validate exact-baseline compatibility suite",
              status: "completed",
              conclusion: "success",
            },
          ],
        ),
      ],
    },
  });
  return {
    RELEASE_COMPATIBILITY_TEST_RESULT: "success",
    RELEASE_COMPATIBILITY_BASELINE_SHA: f.deployed,
    RELEASE_COMPATIBILITY_SOURCE_SHA: f.merge,
    RELEASE_COMPATIBILITY_SOURCE_TREE: f.git([
      "rev-parse",
      `${f.merge}^{tree}`,
    ]),
    ...overrides,
  };
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
  let result = run(f, "inspect-source-qa", env);
  assert.equal(result.status, 0, result.stderr);
  result = run(f, "record-source-qa", env);
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
    "pre-production-forward-only",
  );
  assert.equal(state.recoveryEvidence.facts.database.rollbackAllowed, true);
  assert.ok(Date.parse(state.recoveryEvidence.expiresAt) > Date.now());
});

test("pre-production contract changes may promote but cannot roll code back", async (t) => {
  const f = await fixture(t, { persistedContract: true });
  const { accepted } = await prepareAcceptedRelease(f, {
    env: {},
  });
  const state = JSON.parse(await readFile(accepted, "utf8"));
  assert.equal(
    state.recoveryEvidence.facts.database.policy,
    "pre-production-forward-only",
  );
  assert.equal(state.recoveryEvidence.facts.database.rollbackAllowed, false);

  const promoted = run(f, "promote", {
    RELEASE_STATE_FILE: accepted,
    RELEASE_SHA: f.merge,
  });
  assert.equal(promoted.status, 0, promoted.stderr);
  await updateApi(f, { alias: "dpl_cand" });
  const rollback = run(f, "rollback-if-compatible", {
    RELEASE_STATE_FILE: accepted,
    RELEASE_SHA: f.merge,
  });
  assert.notEqual(rollback.status, 0);
  assert.match(rollback.stderr, /forward-only contract change/);
  assert.equal(
    JSON.parse(await readFile(f.statePath, "utf8")).alias,
    "dpl_cand",
  );
});

test("active production data requires exact-source integration proof for persisted contract changes", async (t) => {
  const f = await fixture(t, { persistedContract: true });
  const env = { PRODUCTION_DB_ACTIVE: "true" };
  const { env: sourceEnv } = await prepareSourceRelease(f, { env });
  const accepted = path.join(f.root, "missing-proof.json");
  const missing = run(f, "record-recovery-evidence", {
    ...sourceEnv,
    RELEASE_ACCEPTED_STATE_FILE: accepted,
  });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /release-compatibility\.itest\.ts/);
  assert.equal(await readFile(accepted, "utf8").catch(() => ""), "");

  const proofFixture = await fixture(t, {
    persistedContract: true,
    persistedContractPath: "src/entities/game.ts",
    compatibilityTest: true,
  });
  const compatibilityEnv = await passingCompatibilityTestEnv(proofFixture);
  const proofRelease = await prepareAcceptedRelease(proofFixture, {
    env: { PRODUCTION_DB_ACTIVE: "true", ...compatibilityEnv },
  });
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
  const lifecycleChanged = run(proofFixture, "promote", {
    RELEASE_STATE_FILE: proofRelease.accepted,
    RELEASE_SHA: proofFixture.merge,
    PRODUCTION_DB_ACTIVE: "false",
  });
  assert.notEqual(lifecycleChanged.status, 0);
  assert.match(lifecycleChanged.stderr, /database lifecycle changed/);
});

test("unclassified production source paths stop instead of implying compatibility", async (t) => {
  const f = await fixture(t, {
    persistedContract: true,
    persistedContractPath: "src/app/(tabs)/teams/page.tsx",
  });
  const source = await prepareSourceRelease(f, {
    env: { PRODUCTION_DB_ACTIVE: "true" },
  });
  const result = run(f, "record-recovery-evidence", {
    ...source.env,
    RELEASE_ACCEPTED_STATE_FILE: path.join(f.root, "unclassified.json"),
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Cannot classify changed paths/);
  assert.match(result.stderr, /src\/app\/\(tabs\)\/teams\/page\.tsx/);
});

test("persisted application writers and dependency-lock changes require targeted proof", async (t) => {
  for (const persistedContractPath of [
    "src/applications/usecases/game/update-set.usecase.ts",
    "pnpm-lock.yaml",
  ]) {
    const f = await fixture(t, {
      persistedContract: true,
      persistedContractPath,
    });
    const source = await prepareSourceRelease(f, {
      env: { PRODUCTION_DB_ACTIVE: "true" },
    });
    const result = run(f, "record-recovery-evidence", {
      ...source.env,
      RELEASE_ACCEPTED_STATE_FILE: path.join(f.root, "missing-suite.json"),
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /release-compatibility\.itest\.ts must exist/);
  }
});

test("production package version metadata alone is not a persisted contract change", async (t) => {
  const f = await fixture(t);
  const { accepted } = await prepareAcceptedRelease(f, {
    env: { PRODUCTION_DB_ACTIVE: "true" },
  });
  const state = JSON.parse(await readFile(accepted, "utf8"));
  assert.equal(
    state.recoveryEvidence.facts.database.policy,
    "production-contract-unchanged",
  );
  assert.equal(state.recoveryEvidence.facts.database.rollbackAllowed, true);
});

test("compatibility report requires both directional assertions to pass without skips", async (t) => {
  const f = await fixture(t);
  const suitePath =
    "test/integration/persistence/release-compatibility.itest.ts";
  const baselineAssertion = `production baseline ${f.deployed} reads candidate-written records`;
  const reportPath = path.join(f.root, "compatibility-report.json");
  const sourceTree = f.git(["rev-parse", `${f.merge}^{tree}`]);
  const expectedAssertions = [
    "candidate reads legacy persisted records",
    baselineAssertion,
  ];
  const report = (assertionTitles, skipped = 0, assertionStatuses = []) => ({
    numFailedTests: 0,
    numPendingTests: skipped,
    numTodoTests: 0,
    numPassedTests: assertionTitles.length - skipped,
    numTotalTests: assertionTitles.length,
    testResults: [
      {
        name: path.join(f.repo, suitePath),
        status: "passed",
        assertionResults: assertionTitles.map((title, index) => ({
          title,
          status:
            assertionStatuses[index] ??
            (index < skipped ? "skipped" : "passed"),
        })),
      },
    ],
  });
  const env = {
    PRODUCTION_BASELINE_SHA: f.deployed,
    RELEASE_CANDIDATE_SHA: f.merge,
    RELEASE_CANDIDATE_TREE: sourceTree,
    RELEASE_COMPATIBILITY_REPORT: reportPath,
  };

  await writeFile(reportPath, JSON.stringify(report(expectedAssertions)));
  const passed = run(f, "verify-compatibility-report", env);
  assert.equal(passed.status, 0, passed.stderr);
  assert.match(await readFile(f.env.GITHUB_OUTPUT, "utf8"), /result=success/);

  const wrongBaselineSha = `${f.deployed.slice(0, -1)}${f.deployed.endsWith("0") ? "1" : "0"}`;
  const wrongBaselineAssertion = `production baseline ${wrongBaselineSha} reads candidate-written records`;
  const invalidReports = [
    report(expectedAssertions, 1),
    report(expectedAssertions.slice(0, 1)),
    report(["unrelated assertion one", "unrelated assertion two"]),
    report([expectedAssertions[0], wrongBaselineAssertion]),
    report([expectedAssertions[0], expectedAssertions[0]]),
    report(expectedAssertions, 0, ["failed", "passed"]),
    report(expectedAssertions, 0, ["passed", "skipped"]),
  ];
  for (const [index, invalidReport] of invalidReports.entries()) {
    await writeFile(reportPath, JSON.stringify(invalidReport));
    const rejected = run(f, "verify-compatibility-report", {
      ...env,
      GITHUB_OUTPUT: path.join(f.root, `invalid-${index}.out`),
    });
    assert.notEqual(rejected.status, 0);
    assert.match(
      rejected.stderr,
      /Compatibility report|Compatibility report is missing/,
    );
  }
});

test("active production contract changes require a passing exact-baseline suite receipt", async (t) => {
  const f = await fixture(t, {
    persistedContract: true,
    compatibilityTest: true,
  });
  const source = await prepareSourceRelease(f, {
    env: { PRODUCTION_DB_ACTIVE: "true" },
  });
  const accepted = path.join(f.root, "missing-suite-receipt.json");
  const missing = run(f, "record-recovery-evidence", {
    ...source.env,
    RELEASE_ACCEPTED_STATE_FILE: accepted,
  });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /compatibility integration test did not pass/i);
  assert.equal(await readFile(accepted, "utf8").catch(() => ""), "");

  const mismatchEnv = await passingCompatibilityTestEnv(f, {
    RELEASE_COMPATIBILITY_BASELINE_SHA: "b".repeat(40),
  });
  const mismatch = run(f, "record-recovery-evidence", {
    ...source.env,
    ...mismatchEnv,
    RELEASE_ACCEPTED_STATE_FILE: accepted,
  });
  assert.notEqual(mismatch.status, 0);
  assert.match(mismatch.stderr, /did not pass for this release/i);
  assert.equal(await readFile(accepted, "utf8").catch(() => ""), "");
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
  const compatibilityEnv = await passingCompatibilityTestEnv(f);
  const release = await prepareAcceptedRelease(f, {
    env: { PRODUCTION_DB_ACTIVE: "true", ...compatibilityEnv },
  });
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
  const compatibilityEnv = await passingCompatibilityTestEnv(f);
  const { accepted } = await prepareAcceptedRelease(f, {
    env: { PRODUCTION_DB_ACTIVE: "true", ...compatibilityEnv },
  });
  await updateApi(f, { alias: "dpl_cand" });
  let state = JSON.parse(await readFile(f.statePath, "utf8"));
  const job = state.jobs[9][0];
  job.steps[0].conclusion = "failure";
  await updateApi(f, { jobs: state.jobs });
  state = JSON.parse(await readFile(f.statePath, "utf8"));
  const callsBeforeRollback = state.calls;

  const denied = run(f, "rollback-if-compatible", {
    RELEASE_STATE_FILE: accepted,
    PRODUCTION_DB_ACTIVE: "true",
  });
  assert.notEqual(denied.status, 0);
  assert.match(denied.stderr, /compatibility suite and report did not pass/i);
  const after = JSON.parse(await readFile(f.statePath, "utf8"));
  assert.equal(after.alias, "dpl_cand");
  assert.deepEqual(after.calls, callsBeforeRollback);
});

test("active production data rejects compatibility coverage removed from the exact source", async (t) => {
  const f = await fixture(t, {
    persistedContract: true,
    removeCompatibilityTest: true,
  });
  const source = await prepareSourceRelease(f, {
    env: { PRODUCTION_DB_ACTIVE: "true" },
  });
  const accepted = path.join(f.root, "removed-test-proof.json");
  const result = run(f, "record-recovery-evidence", {
    ...source.env,
    RELEASE_ACCEPTED_STATE_FILE: accepted,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must exist in the exact release source/);
  assert.equal(await readFile(accepted, "utf8").catch(() => ""), "");
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
  const f = await fixture(t);
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
  let result = run(f, "inspect-source-qa");
  assert.equal(result.status, 0, result.stderr);
  result = run(f, "record-source-qa");
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
    const denied = run(f, "inspect-source-qa");
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
  result = run(f, "inspect-source-qa");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /trusted CI evidence/);
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
  let result = run(f, "inspect-source-qa");
  assert.equal(result.status, 0, result.stderr);
  const plan = await readFile(f.env.RELEASE_STATE_FILE, "utf8");
  result = run(f, "record-source-qa");
  assert.equal(result.status, 0, result.stderr);
  const state = JSON.parse(await readFile(f.env.RELEASE_STATE_FILE, "utf8"));
  assert.equal(state.sha, f.merge);
  assert.equal(state.sourceQA.scopes.unit.testedSha, f.merge);
  assert.equal(state.sourceQA.scopes.unit.producerSha, f.deployed);
  for (const invalid of [
    { ...ciRun, head_branch: "foreign" },
    { ...ciRun, triggering_actor: { login: "outsider" } },
  ]) {
    await updateApi(f, { runs: { ...api.runs, 77: invalid } });
    await writeFile(f.env.RELEASE_STATE_FILE, plan);
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
      9: current.jobs[9].filter(
        (job) =>
          !["finalize-release", "Accept production QA"].includes(job.name),
      ),
    },
    candidate: { readyState: "CANCELED" },
  });
  result = run(f, "recover-verify", recoveryEnv);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /deployment|readiness|live alias/i);
  await updateApi(f, { candidate: undefined });

  const currentBeforeLegacy = JSON.parse(await readFile(f.statePath, "utf8"));
  const currentArtifact = currentBeforeLegacy.artifacts[9][0];
  const currentState = await readFile(stateFile);
  const legacyState = JSON.parse(currentState.toString("utf8"));
  legacyState.stateVersion = 2;
  delete legacyState.releaseMode;
  delete legacyState.productionDatabaseActive;
  delete legacyState.recoveryEvidence;
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
    "# Changes\\n\\n## [1.1.0]\\n\\n- Wrong bump\\n",
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
      stateVersion: 3,
      sha: f.hotfix,
      controllerSha: f.deployed,
      releaseRunId: "9",
      releaseRunAttempt: "1",
      releaseMode: "hotfix",
      productionDatabaseActive: false,
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
  assert.equal(
    state.calls.filter((args) => args[0] === "release" && args[1] === "create")
      .length,
    1,
  );
  f.git(["tag", "-f", "v1.0.1", `${f.merge}^1`]);
  result = run(f, "finalize", env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /different commit/);
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
