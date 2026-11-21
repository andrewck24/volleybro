import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { parse } from "yaml";

function evaluateActionsExpression(expression, context) {
  return runInNewContext(expression.replace(/^\$\{\{(.*)\}\}$/s, "$1"), {
    ...context,
  });
}

function renderActionsTemplate(template, context) {
  return template.replace(/\$\{\{(.*?)\}\}/g, (_, expression) =>
    evaluateActionsExpression(expression, context),
  );
}

const loadWorkflow = (name) =>
  parse(readFileSync(`.github/workflows/${name}.yml`, "utf8"));
const ci = loadWorkflow("ci");
const metadata = loadWorkflow("pr-metadata");
test("PR edits trigger only the separate metadata workflow", () => {
  assert.equal(ci.on.pull_request.types.includes("edited"), false);
  assert.equal(metadata.on.pull_request.types.includes("edited"), true);

  const github = {
    event: { pull_request: { number: 42 } },
  };
  assert.notEqual(
    renderActionsTemplate(ci.concurrency.group, {
      github: { ...github, workflow: ci.name },
      inputs: { source: "" },
    }),
    renderActionsTemplate(metadata.concurrency.group, { github }),
  );
});

test("opening, reopening or pushing to a PR still triggers both checks", () => {
  for (const action of ["opened", "reopened", "synchronize"]) {
    assert.ok(ci.on.pull_request.types.includes(action), action);
    assert.ok(metadata.on.pull_request.types.includes(action), action);
  }
  assert.ok(Object.values(ci.jobs).some(({ name }) => name === "Verify"));
  assert.ok(
    Object.values(metadata.jobs).some(({ name }) => name === "PR metadata"),
  );
});

function runMetadata(t, eventOverrides, githubState = {}) {
  const directory = mkdtempSync(join(tmpdir(), "pr-metadata-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const eventPath = join(directory, "event.json");
  const event = {
    action: "edited",
    changes: {},
    ...eventOverrides,
    pull_request: {
      node_id: "pr-id",
      head: { sha: "current-head" },
      title: "ci: update workflow",
      body: "A PR description",
      ...eventOverrides.pull_request,
    },
  };
  writeFileSync(eventPath, JSON.stringify(event));
  writeFileSync(
    join(directory, "gh"),
    `#!/usr/bin/env node
const args = process.argv.slice(2);
const { retargetedAt, runs = [] } = JSON.parse(process.env.METADATA_GITHUB_STATE);
if (args[1] === "graphql") {
  console.log(retargetedAt ?? "");
} else if (args.includes("repos/example/volleybro/actions/workflows/ci.yml/runs")) {
  const filters = new URLSearchParams(args.filter((_, index) => args[index - 1] === "-f").join("&"));
  const count = runs.filter(({ head, createdAt }) =>
    filters.get("event") === "pull_request" &&
    head === filters.get("head_sha") &&
    "<=" + createdAt <= filters.get("created")
  ).length;
  console.log(count);
} else {
  process.exitCode = 2;
}
`,
    { mode: 0o755 },
  );

  const job = Object.values(metadata.jobs).find(
    ({ name }) => name === "PR metadata",
  );
  const validationSteps = job.steps.filter(
    ({ run }) => run && !/^pnpm install(?:\s|$)/.test(run.trimStart()),
  );
  const failures = [];
  for (const step of validationSteps) {
    const env = Object.fromEntries(
      Object.entries(step.env ?? {}).map(([key, value]) => [
        key,
        renderActionsTemplate(value, {
          github: { event, token: "" },
          vars: { RELEASE_BOT_LOGIN: "" },
        }),
      ]),
    );
    const result = spawnSync("bash", ["-ec", step.run], {
      env: {
        ...process.env,
        ...env,
        PATH: `${directory}:${process.env.PATH}`,
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_REPOSITORY: "example/volleybro",
        METADATA_GITHUB_STATE: JSON.stringify(githubState),
      },
      encoding: "utf8",
    });
    assert.ifError(result.error);
    if (result.status !== 0) failures.push(result);
  }
  return failures;
}

for (const [field, title, body, error] of [
  ["title", "invalid title", "A PR description", /type-empty/],
  [
    "body",
    "ci: update workflow",
    " \n ",
    /Enter a PR description or release notes/,
  ],
]) {
  test(`PR metadata rejects an invalid ${field} from the event payload`, (t) => {
    const failures = runMetadata(t, {
      changes: { [field]: { from: "Previous value" } },
      pull_request: { title, body },
    });
    assert.equal(failures.length, 1);
    assert.equal(failures[0].status, 1);
    assert.match(failures[0].stdout + failures[0].stderr, error);
  });
}

const retargetedAt = "2026-11-21T12:00:00Z";
const runs = [
  { head: "current-head", createdAt: retargetedAt },
  { head: "fresh-head", createdAt: "2026-11-21T12:01:00Z" },
];

test("a base edit rejects same-head CI evidence even before the timeline reports the change", (t) => {
  const failures = runMetadata(
    t,
    {
      changes: { base: { ref: { from: "old-base" } } },
      pull_request: { updated_at: retargetedAt },
    },
    { runs },
  );
  assert.equal(failures.length, 1);
  assert.match(
    failures[0].stderr,
    /Push a new commit after changing the base branch/,
  );
});

test("a later body edit still rejects CI evidence predating a base change", (t) => {
  const failures = runMetadata(
    t,
    { changes: { body: { from: "Previous description" } } },
    { retargetedAt, runs },
  );
  assert.equal(failures.length, 1);
  assert.match(
    failures[0].stderr,
    /Push a new commit after changing the base branch/,
  );
});

test("metadata edits pass on a head first verified after a base change", (t) => {
  const failures = runMetadata(
    t,
    {
      changes: { body: { from: "Previous description" } },
      pull_request: { head: { sha: "fresh-head" } },
    },
    { retargetedAt, runs },
  );
  assert.deepEqual(failures, []);
});
