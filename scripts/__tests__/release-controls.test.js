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
    `${JSON.stringify(
      { name: "fixture", version: "1.0.0", dependencies: { secure: "1.0.0" } },
      null,
      2,
    )}\n`,
  );
  await writeFile(path.join(repo, "CHANGELOG.md"), "# Changes\\n");
  git(["add", "."]);
  git(["commit", "-m", "deployed"]);
  const deployed = git(["rev-parse", "HEAD"]);
  git(["tag", "v1.0.0", deployed]);
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
      ciRuns: [],
      runs: {
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
      jobs: { 9: [] },
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
    const preview=url.pathname.match(/^\/v2\/deployments\/(dpl_preview)\/aliases$/);
    if(preview){const body=JSON.parse(options.body);s.integrationAlias=preview[1];s.integrationAliasName=body.alias;save();return Response.json({alias:body.alias,deploymentId:preview[1]});}
    const match=url.pathname.match(/^\/v(10|1)\/projects\/test\/(promote|rollback)\/(dpl_cand|dpl_base)$/);
    if(!match)throw Error('Unexpected mutation '+url.pathname);
    if(s.mutationStatus)return new Response('',{status:s.mutationStatus});
    s.pendingAlias=match[3];s.remainingPolls=s.delayPolls||0;save();
    return new Response(null,{status:202});
  }
  if(url.pathname.includes('/v4/aliases/')){
    const requested=decodeURIComponent(url.pathname.split('/').at(-1));
    if(requested!=='app.test')return Response.json({alias:requested,deploymentId:s.integrationAlias||'dpl_old_preview',updatedAt:'2'});
    if(s.pendingAlias&&!s.neverTransition){if(s.remainingPolls>0)s.remainingPolls--;else{s.alias=s.pendingAlias;delete s.pendingAlias;}save();}
    return Response.json({alias:'app.test',deploymentId:s.alias,updatedAt:s.updatedAt});
  }
  if(url.pathname.includes('/v13/deployments/')){
    const id=url.pathname.split('/').at(-1);
    if(id==='dpl_cand')return Response.json({id,projectId:'test',readyState:s.readiness||'READY',target:'production',meta:{releaseSha:process.env.RELEASE_SHA},alias:[],...s.candidate});
    if(id==='dpl_preview')return Response.json({id,projectId:'test',readyState:s.previewReadiness||'READY',target:s.previewTarget??'preview',meta:{releaseSha:process.env.RELEASE_SHA},...s.preview});
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
      CONTROLLER_SHA: deployed,
      GITHUB_SHA: merge,
      VERCEL_TOKEN: "test",
      VERCEL_PROJECT: "test",
      VERCEL_PROJECT_ID: "test",
      VERCEL_ORG_ID: "team_test",
      VERCEL_TEAM_SLUG: "test-team",
      PRODUCTION_ALIAS: "app.test",
      INTEGRATION_ALIAS: "integration.test",
      RELEASE_STATE_FILE: path.join(root, "staged.json"),
      GITHUB_OUTPUT: path.join(root, "output"),
      GITHUB_RUN_ID: "9",
      GITHUB_RUN_ATTEMPT: "1",
      GITHUB_JOB: "candidate-acceptance",
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
  await updateApi(f, { project: { id: "test", ssoProtection: null } });
  const denied = run(f, "promote");
  assert.notEqual(denied.status, 0);
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

test("rollback requires accepted run-bound evidence, not mutable environment values", async (t) => {
  const f = await fixture(t);
  const { accepted } = await prepareAcceptedRelease(f);
  await updateApi(f, { alias: "dpl_cand" });
  let result = run(f, "rollback-if-compatible", {
    RELEASE_ACCEPTED_STATE_FILE: accepted,
    RELEASE_STATE_FILE: accepted,
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

async function updateApi(f, values) {
  const current = JSON.parse(await readFile(f.statePath, "utf8"));
  await writeFile(f.statePath, JSON.stringify({ ...current, ...values }));
}

async function githubOutputs(f) {
  const values = {};
  for (const line of (await readFile(f.env.GITHUB_OUTPUT, "utf8")).split(
    "\n",
  )) {
    const separator = line.indexOf("=");
    if (separator > 0)
      values[line.slice(0, separator)] = line.slice(separator + 1);
  }
  return values;
}

function workflowJob(id, name, status = "completed", conclusion = "success") {
  return { id, name, status, conclusion, run_attempt: 1 };
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

async function prepareAcceptedRelease(
  f,
  {
    env = {},
    staged = false,
    prebinding = f.head,
    probeJobBinding = false,
  } = {},
) {
  if (!staged) assert.equal(run(f, "stage", env).status, 0);
  const sourceSha = env.RELEASE_SHA || f.merge;
  const evidence = "https://github.com/owner/repo/blob/main/docs/recovery.md";
  let result = run(f, "inspect-source-qa", {
    ...env,
    RELEASE_ROLLBACK_COMPATIBILITY: `dpl_base:${prebinding}`,
    RELEASE_ROLLBACK_EVIDENCE: evidence,
  });
  assert.equal(result.status, 0, result.stderr);
  const api = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    jobs: {
      ...api.jobs,
      9: [
        workflowJob(501, "Test source"),
        workflowJob(502, "Integration source"),
      ],
    },
  });
  result = run(f, "record-source-qa", env);
  assert.equal(result.status, 0, result.stderr);
  const accepted = path.join(f.root, "accepted.json");
  const withSource = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    jobs: {
      ...withSource.jobs,
      9: [
        workflowJob(501, "Test source"),
        workflowJob(502, "Integration source"),
        workflowJob(503, "Accept candidate evidence", "in_progress", null),
      ],
    },
    approvals: { ...withSource.approvals, 9: [approval()] },
  });
  const binding = `dpl_base:dpl_cand:${sourceSha}`;
  if (probeJobBinding) {
    const denied = run(f, "record-compatibility", {
      ...env,
      RELEASE_ACCEPTED_STATE_FILE: accepted,
      RELEASE_ROLLBACK_COMPATIBILITY: binding,
      RELEASE_ROLLBACK_EVIDENCE: evidence,
      GITHUB_JOB: "source-receipt",
    });
    assert.notEqual(denied.status, 0);
    assert.match(denied.stderr, /unexpected workflow job/);
    assert.equal(await readFile(accepted, "utf8").catch(() => ""), "");
  }
  result = run(f, "record-compatibility", {
    ...env,
    RELEASE_ACCEPTED_STATE_FILE: accepted,
    RELEASE_ROLLBACK_COMPATIBILITY: binding,
    RELEASE_ROLLBACK_EVIDENCE: evidence,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    JSON.parse(await readFile(accepted, "utf8")).compatibility.approval
      .githubJob,
    "candidate-acceptance",
  );
  const protectedApi = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    jobs: {
      ...protectedApi.jobs,
      9: protectedApi.jobs[9].map((job) =>
        job.id === 503
          ? { ...job, status: "completed", conclusion: "success" }
          : job,
      ),
    },
  });
  return { accepted, binding, evidence };
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

test("candidate approval receipt is bound to its protected workflow job", async (t) => {
  const f = await fixture(t);
  const { accepted } = await prepareAcceptedRelease(f, {
    probeJobBinding: true,
  });
  const state = JSON.parse(await readFile(accepted, "utf8"));
  assert.equal(state.compatibility.approval.githubJob, "candidate-acceptance");
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
    "record-compatibility",
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
    prebinding: f.hotfix,
  });
  const promoted = run(f, "promote", {
    ...env,
    RELEASE_STATE_FILE: accepted,
  });
  assert.equal(promoted.status, 0, promoted.stderr);
});

test("source QA reuses only each successful exact-source trusted CI scope", async (t) => {
  const f = await fixture(t);
  assert.equal(run(f, "stage").status, 0);
  await writeFile(f.env.GITHUB_OUTPUT, "");
  const api = JSON.parse(await readFile(f.statePath, "utf8"));
  const ciRun = {
    id: 77,
    path: ".github/workflows/ci.yml@refs/heads/main",
    workflow_id: 42,
    event: "workflow_dispatch",
    head_sha: f.merge,
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
        workflowJob(601, "Test"),
        workflowJob(602, "Integration", "completed", "failure"),
      ],
    },
  });
  const evidence = "https://github.com/owner/repo/blob/main/docs/recovery.md";
  let result = run(f, "inspect-source-qa", {
    RELEASE_ROLLBACK_COMPATIBILITY: `dpl_base:${f.head}`,
    RELEASE_ROLLBACK_EVIDENCE: evidence,
  });
  assert.equal(result.status, 0, result.stderr);
  let outputs = await githubOutputs(f);
  assert.equal(outputs.source_unit_needed, "false");
  assert.equal(outputs.source_integration_needed, "true");
  const inspected = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    jobs: {
      ...inspected.jobs,
      9: [workflowJob(603, "Integration source")],
    },
  });
  result = run(f, "record-source-qa");
  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(await readFile(f.env.RELEASE_STATE_FILE, "utf8"));
  assert.equal(receipt.sourceQA.scopes.unit.kind, "ci-reuse");
  assert.equal(receipt.sourceQA.scopes.integration.kind, "release-run");

  const untrusted = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    workflowBlobs: { ...untrusted.workflowBlobs, [f.merge]: "b".repeat(40) },
  });
  await writeFile(f.env.GITHUB_OUTPUT, "");
  result = run(f, "inspect-source-qa", {
    RELEASE_ROLLBACK_COMPATIBILITY: `dpl_base:${f.head}`,
    RELEASE_ROLLBACK_EVIDENCE: evidence,
  });
  assert.equal(result.status, 0, result.stderr);
  outputs = await githubOutputs(f);
  assert.equal(outputs.source_unit_needed, "true");
  assert.equal(outputs.source_integration_needed, "true");
});

test("explicit source gap binds a fixed-alias Preview and native approval", async (t) => {
  const f = await fixture(t);
  assert.equal(run(f, "stage").status, 0);
  const evidence = "https://github.com/owner/repo/blob/main/docs/recovery.md";
  let result = run(f, "inspect-source-qa", {
    RELEASE_SOURCE_QA_GAP: "Google integration requires the fixed OAuth alias",
    RELEASE_ROLLBACK_COMPATIBILITY: `dpl_base:${f.head}`,
    RELEASE_ROLLBACK_EVIDENCE: evidence,
  });
  assert.equal(result.status, 0, result.stderr);
  const sourcePlan = await readFile(f.env.RELEASE_STATE_FILE, "utf8");
  await writeFile(f.env.GITHUB_OUTPUT, "");
  result = run(f, "prepare-source-preview");
  assert.equal(result.status, 0, result.stderr);
  const outputs = await githubOutputs(f);
  assert.equal(outputs.preview_id, "dpl_preview");
  assert.equal(outputs.preview_url, "https://integration.test");

  await writeFile(f.env.RELEASE_STATE_FILE, sourcePlan);
  const api = JSON.parse(await readFile(f.statePath, "utf8"));
  await updateApi(f, {
    previewTarget: "production",
    jobs: {
      ...api.jobs,
      9: [
        workflowJob(611, "Test source"),
        workflowJob(612, "Integration source"),
        workflowJob(613, "Accept source Preview"),
      ],
    },
    approvals: { ...api.approvals, 9: [approval()] },
  });
  result = run(f, "record-source-qa", { SOURCE_PREVIEW_ID: "dpl_preview" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Preview identity/);
  await updateApi(f, { previewTarget: "preview" });
  result = run(f, "record-source-qa", { SOURCE_PREVIEW_ID: "dpl_preview" });
  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(await readFile(f.env.RELEASE_STATE_FILE, "utf8"));
  assert.deepEqual(
    {
      deploymentId: receipt.sourceQA.preview.deploymentId,
      alias: receipt.sourceQA.preview.alias,
      gap: receipt.sourceQA.preview.gap,
      job: receipt.sourceQA.preview.approval.githubJob,
      reviewer: receipt.sourceQA.preview.approval.reviewHistory[0].user.login,
    },
    {
      deploymentId: "dpl_preview",
      alias: "integration.test",
      gap: "Google integration requires the fixed OAuth alias",
      job: "source-preview-acceptance",
      reviewer: "reviewer",
    },
  );
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
  result = run(f, "recover-verify", recoveryEnv);
  assert.equal(result.status, 0, result.stderr);
  const recovered = JSON.parse(await readFile(recovery, "utf8"));
  assert.deepEqual(recovered.recovery, {
    verified: true,
    owner: "release-owner",
    runId: "10",
    runAttempt: "1",
    originalRunId: "9",
    originalRunAttempt: "1",
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
      sha: f.hotfix,
      candidateId: "dpl_hotfix",
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

test("candidate acceptance fails closed without recovery proof", async (t) => {
  const f = await fixture(t);
  assert.equal(run(f, "stage").status, 0);
  const accepted = path.join(f.root, "accepted.json");
  const result = run(f, "record-compatibility", {
    RELEASE_ACCEPTED_STATE_FILE: accepted,
    RELEASE_ROLLBACK_COMPATIBILITY: "",
    RELEASE_ROLLBACK_EVIDENCE: "",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /recovery evidence/i);
  assert.equal(await readFile(accepted, "utf8").catch(() => ""), "");
});

test("promotion and publication require accepted receipts, not only a healthy alias", async (t) => {
  const f = await fixture(t);
  assert.equal(run(f, "stage").status, 0);
  const denied = run(f, "promote");
  assert.notEqual(denied.status, 0);
  assert.match(denied.stderr, /compatibility evidence|recovery evidence/i);
  await updateApi(f, { alias: "dpl_cand" });
  const publication = run(f, "finalize");
  assert.notEqual(publication.status, 0);
  assert.match(publication.stderr, /production QA/i);
  assert.equal(f.git(["tag", "--list", "v1.0.1"]), "");
});
