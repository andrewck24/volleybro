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
import { fileURLToPath } from "node:url";

export const cli =
  process.env.RELEASE_TEST_CLI ||
  fileURLToPath(new URL("../release-controls.js", import.meta.url));

export const lockfile = (version) =>
  `packages:\n\n  better-auth@${version}:\n    resolution: {}\n`;

export async function fixture(
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

export function run(f, action, extra = {}) {
  return spawnSync(process.execPath, ["--import", f.preload, cli, action], {
    cwd: f.repo,
    env: { ...process.env, ...f.env, ...extra },
    encoding: "utf8",
  });
}

export async function updateApi(f, values) {
  const current = JSON.parse(await readFile(f.statePath, "utf8"));
  await writeFile(f.statePath, JSON.stringify({ ...current, ...values }));
}

export function workflowJob(
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

export function ciScopeJob(git, id, name, source) {
  return {
    ...workflowJob(id, name),
    steps: [
      `Producer workflow ${source}`,
      `Source tree ${git(["rev-parse", `${source}^{tree}`])} at ${source}`,
    ].map((name) => ({ name, status: "completed", conclusion: "success" })),
  };
}

export function approval(login = "reviewer") {
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

export async function prepareSourceRelease(
  f,
  { env = {}, staged = false } = {},
) {
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

export async function prepareAcceptedRelease(f, options = {}) {
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

export async function prepareFinalRelease(f) {
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

export async function outputsOf(f) {
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

export async function classify(f, env, overrides = {}) {
  await writeFile(f.env.GITHUB_OUTPUT, "");
  const result = run(f, "classify-smoke", { ...env, ...overrides });
  assert.equal(result.status, 0, result.stderr);
  return outputsOf(f);
}
