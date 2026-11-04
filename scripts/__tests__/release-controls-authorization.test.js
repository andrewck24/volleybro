import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  fixture,
  run,
  updateApi,
  workflowJob,
  ciScopeJob,
  prepareAcceptedRelease,
} from "./release-controls-support.js";

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
