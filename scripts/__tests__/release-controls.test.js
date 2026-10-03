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
    }),
  );
  const stub = async (name, code) => {
    const p = path.join(bin, name);
    await writeFile(p, "#!/usr/bin/env node\n" + code);
    await chmod(p, 0o755);
  };
  await stub(
    "pnpm",
    "const fs=require('fs'),s=JSON.parse(fs.readFileSync(process.env.API_STATE)),a=process.argv.slice(2);s.calls.push(a);fs.writeFileSync(process.env.API_STATE,JSON.stringify(s));if(a.includes('--scope')||a.includes('promote')||a.includes('rollback')){console.error('User not found. (404)');process.exit(1);}if(!process.env.VERCEL_PROJECT_ID||!process.env.VERCEL_ORG_ID){console.error('Missing linked project context');process.exit(1);}console.log(JSON.stringify({id:'dpl_cand',url:'candidate.test'}));",
  );
  await stub(
    "gh",
    "const fs=require('fs'),cp=require('child_process'),s=JSON.parse(fs.readFileSync(process.env.API_STATE)),a=process.argv.slice(2);let result;if(a[0]==='api'){const route=a[1];if(route.includes('/pulls?'))result=s.mergeBackPr?[s.mergeBackPr]:[];else if(route.includes('/pulls/'))result=s.pr;else if(route.includes('/check-runs'))result={check_runs:s.checks};else if(route.includes('/statuses?'))result=s.statuses;else if(route.includes('/environments/'))result=s.environment||{protection_rules:[{type:'required_reviewers',reviewers:[{}]}]};else throw Error('Unexpected route '+route);}else if(a[0]==='release'&&a[1]==='view'){if(!s.existingRelease)process.exit(1);result={tagName:'v1.0.1'};}else if(a[0]==='release'&&a[1]==='create'){s.calls.push(a);s.existingRelease=true;fs.writeFileSync(process.env.API_STATE,JSON.stringify(s));result={};}else if(a[0]==='pr'&&a[1]==='create'){const branch=a[a.indexOf('--head')+1],sha=cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();s.calls.push(a);s.mergeBackPr={state:'open',merged_at:null,html_url:'https://example.test/pull/2',base:{ref:'main',repo:{full_name:'owner/repo'}},head:{ref:branch,sha,repo:{full_name:'owner/repo'}}};fs.writeFileSync(process.env.API_STATE,JSON.stringify(s));console.log(s.mergeBackPr.html_url);return;}else throw Error('Unexpected gh action');console.log(JSON.stringify(result));",
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
  if(options.method==='POST'){
    s.calls.push([url.pathname]);save();
    const match=url.pathname.match(/^\/v(10|1)\/projects\/test\/(promote|rollback)\/(dpl_cand|dpl_base)$/);
    if(!match)throw Error('Unexpected mutation '+url.pathname);
    if(s.mutationStatus)return new Response('',{status:s.mutationStatus});
    s.pendingAlias=match[3];s.remainingPolls=s.delayPolls||0;save();
    return new Response(null,{status:202});
  }
  if(url.pathname.includes('/v4/aliases/')){
    if(s.pendingAlias&&!s.neverTransition){if(s.remainingPolls>0)s.remainingPolls--;else{s.alias=s.pendingAlias;delete s.pendingAlias;}save();}
    return Response.json({alias:'app.test',deploymentId:s.alias,updatedAt:s.updatedAt});
  }
  if(url.pathname.includes('/v13/deployments/')){
    const id=url.pathname.split('/').at(-1);
    if(id==='dpl_cand')return Response.json({id,readyState:s.readiness||'READY',target:'production',meta:{releaseSha:process.env.RELEASE_SHA},alias:[],...s.candidate});
    return Response.json({id,meta:{releaseSha:(s.deploymentShas||{})[id]||s.baselineSha}});
  }
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
      RELEASE_STATE_FILE: path.join(root, "staged.json"),
      GITHUB_OUTPUT: path.join(root, "output"),
      GITHUB_RUN_ID: "9",
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
    HOTFIX_AUTHORIZATION: JSON.stringify(authorization),
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
  const promoted = run(f, "promote", env);
  assert.equal(promoted.status, 0, promoted.stderr);
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
  assert.equal(run(f, "stage").status, 0);
  await updateApi(f, { alias: "dpl_hotfix" });
  let result = run(f, "promote");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /baseline changed/);
  await updateApi(f, { alias: "dpl_base", readiness: "BUILDING" });
  assert.notEqual(run(f, "promote").status, 0);
  let state = JSON.parse(await readFile(f.statePath, "utf8"));
  assert.equal(
    state.calls.some((args) =>
      args.includes("/v10/projects/test/promote/dpl_cand"),
    ),
    false,
  );
  await updateApi(f, { readiness: "READY" });
  assert.equal(run(f, "promote").status, 0);
  state = JSON.parse(await readFile(f.statePath, "utf8"));
  assert.equal(state.alias, "dpl_cand");
  for (const mutationStatus of [403, 404]) {
    await updateApi(f, { alias: "dpl_base", mutationStatus });
    const denied = run(f, "promote");
    assert.notEqual(denied.status, 0);
    assert.match(denied.stderr, /Vercel API (403|404)/);
  }
  await updateApi(f, { alias: "dpl_base", mutationStatus: 0, delayPolls: 2 });
  assert.equal(run(f, "promote").status, 0);
  await updateApi(f, { alias: "dpl_base", neverTransition: true });
  const queued = run(f, "promote");
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
