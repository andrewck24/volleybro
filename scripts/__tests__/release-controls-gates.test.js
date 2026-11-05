import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { persistedContractChanges } from "../release-controls/core.js";
import { parse as parseYaml } from "yaml";
import {
  cli,
  fixture,
  run,
  updateApi,
  prepareAcceptedRelease,
} from "../../test/support/release-controls-fixture.js";

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

test("stage runs the Vercel CLI outside the candidate checkout and deploys that checkout", async (t) => {
  const f = await fixture(t);
  const result = run(f, "stage");
  assert.equal(result.status, 0, result.stderr);
  const { calls, pnpmCwd } = JSON.parse(await readFile(f.statePath, "utf8"));
  const checkout = await realpath(f.repo);
  // pnpm reads .npmrc from its working directory, so a candidate must not choose where the CLI comes from.
  assert.ok(path.relative(checkout, pnpmCwd).startsWith(".."), pnpmCwd);
  const deploy = calls.find((args) => args[0] === "dlx");
  assert.equal(deploy[deploy.indexOf("--cwd") + 1], checkout);
});

test("stage stops before the Vercel CLI when the candidate holds config the CLI would run or load", async (t) => {
  for (const file of ["vercel.ts", ".env.local"]) {
    const f = await fixture(t);
    await writeFile(path.join(f.repo, file), "");
    const result = run(f, "stage");
    assert.notEqual(result.status, 0, file);
    assert.match(result.stderr, new RegExp(file.replace(".", "\\.")));
    const { calls } = JSON.parse(await readFile(f.statePath, "utf8"));
    assert.equal(
      calls.some((args) => args[0] === "dlx"),
      false,
      file,
    );
  }
  const f = await fixture(t);
  await writeFile(path.join(f.repo, ".env.example"), "");
  const result = run(f, "stage");
  assert.equal(result.status, 0, result.stderr);
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

test("app source outside the known-unrelated paths is a contract path", async (t) => {
  const result = await classifyDiff(
    t,
    { "a.txt": "1" },
    {
      "src/app/sw.ts": "x",
      "src/hooks/use-x.ts": "x",
      "src/lib/x.ts": "x",
      "src/components/x.tsx": "x",
      "src/lib/__tests__/x.test.ts": "x",
    },
  );
  assert.deepEqual(result.unclassifiedPaths, []);
  assert.deepEqual(result.contractPaths, [
    "src/app/sw.ts",
    "src/hooks/use-x.ts",
    "src/lib/x.ts",
  ]);
});

test("a pull request that adds an unclassified path fails before any release", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "release-pr-paths-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  git(["init", "-b", "main"]);
  git(["config", "user.email", "test@example.invalid"]);
  git(["config", "user.name", "Test"]);
  const commit = async (file) => {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), "x");
    git(["add", "."]);
    git(["commit", "-m", "c"]);
    return git(["rev-parse", "HEAD"]);
  };
  const check = (baseSha, headSha) => {
    git(["checkout", "--quiet", headSha]);
    return spawnSync(process.execPath, [cli, "check-path-classification"], {
      cwd: root,
      env: { ...process.env, BASE_SHA: baseSha },
      encoding: "utf8",
    });
  };
  const base = await commit("README.md");
  git(["checkout", "-b", "pr"]);
  const classified = await commit("src/lib/x.ts");
  const unknown = await commit("middleware.ts");
  git(["checkout", "main"]);
  const moved = await commit("unrelated-on-main.txt");
  const passed = check(base, classified);
  assert.equal(passed.status, 0, passed.stderr);
  const failed = check(moved, unknown);
  assert.notEqual(failed.status, 0);
  assert.match(
    failed.stderr,
    /cannot classify these paths .*: middleware\.ts\. Add a pattern/,
  );
});

test("CI runs the release path check on pull requests against the base", async () => {
  const { steps } = (await loadWorkflow("ci.yml")).jobs.static;
  const checkout = steps.find((s) => s.uses?.startsWith("actions/checkout"));
  assert.ok(checkout.with["fetch-depth"] >= 2);
  const check = steps.find((s) => s.run?.includes("check-path-classification"));
  assert.equal(check.if, "github.event_name == 'pull_request'");
  assert.match(check.run, /BASE_SHA=\$\(git rev-parse HEAD\^1\)/);
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
    promote: { result: "success" },
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
      "recover-failed-release",
      "production-acceptance",
      "accept-production-smoke",
    ].filter((id) => evalIf(jobs[id].if, needs));
  assert.deepEqual(runs(classify("regression")), ["recover-failed-release"]);
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
      promote: { result: promote },
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
  const recover = jobs["recover-failed-release"].if;
  assert.equal(evalIf(recover, gate("failure")), true);
  assert.equal(evalIf(recover, gate("success")), false);
  assert.equal(evalIf(recover, gate("skipped")), false);
});

test("every job downstream of the hotfix-only job opts out of the implicit success() check", async () => {
  // GitHub's implicit success() skips a job whenever any ancestor was
  // skipped, and authorize-hotfix is skipped on every normal release.
  const { jobs } = await loadWorkflow("production-release.yml");
  const needsOf = (id) => [jobs[id].needs ?? []].flat();
  const downstream = (id) =>
    needsOf(id).some((need) => need === "authorize-hotfix" || downstream(need));
  const unguarded = Object.keys(jobs).filter(
    (id) => downstream(id) && !String(jobs[id].if).includes("always()"),
  );
  assert.deepEqual(unguarded, []);
  const sourceQa = (candidate) =>
    evalIf(jobs["source-qa"].if, { candidate: { result: candidate } });
  assert.equal(sourceQa("success"), true);
  assert.equal(sourceQa("failure"), false);
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
  assert.equal(job["cache-mode"], "none");
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
  assert.ok(jobs.promote.needs.includes("recovery-receipt"));
  assert.doesNotMatch(JSON.stringify(jobs.promote.if), /recovery-evidence/);
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
  assert.equal(runs("hotfix", "success", "", "false"), false);
  // A retry carries no release output of its own and still runs.
  assert.equal(runs("normal-retry", "skipped", ""), true);
  // A failed hotfix authorization stops the candidate.
  assert.equal(runs("hotfix", "failure", ""), false);
});
