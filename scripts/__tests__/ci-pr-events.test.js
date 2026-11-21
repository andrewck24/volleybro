import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parse } from "yaml";
import {
  evaluateActionsExpression,
  renderActionsTemplate,
} from "../../test/support/actions-expression.js";

const loadWorkflow = (name) =>
  parse(readFileSync(`.github/workflows/${name}.yml`, "utf8"));
const ci = loadWorkflow("ci");
const metadata = loadWorkflow("pr-metadata");
const leadingAlways =
  /^\s*(?:\$\{\{\s*)?always\s*\(\s*\)\s*(?:&&|(?:\}\}\s*)?$)/i;

test("job conditions use only the status check modeled by the routing tests", () => {
  for (const workflow of [ci, metadata]) {
    for (const [id, job] of Object.entries(workflow.jobs)) {
      assert.doesNotMatch(
        (job.if ?? "").replace(leadingAlways, ""),
        /\b(?:always|success|failure|cancelled)\s*\(/i,
        `${workflow.name} / ${id} uses an unsupported job status condition`,
      );
    }
  }
});

function route(workflow, action, changes) {
  assert.ok(workflow.on.pull_request.types.includes(action));
  const context = {
    github: {
      workflow: workflow.name,
      event_name: "pull_request",
      event: {
        action,
        changes,
        pull_request: { number: 42, title: "ci: update workflow" },
      },
    },
    inputs: { source: "" },
    matrix: { shard: 1 },
  };
  function reachesRunner(id) {
    const { if: condition, needs } = workflow.jobs[id];
    if (condition && !evaluateActionsExpression(condition, context))
      return false;
    return (
      leadingAlways.test(condition ?? "") ||
      [needs ?? []].flat().every(reachesRunner)
    );
  }
  const checks = Object.entries(workflow.jobs).map(([id, job]) => ({
    name: renderActionsTemplate(job.name, context),
    runs: reachesRunner(id),
  }));
  return {
    group: renderActionsTemplate(workflow.concurrency.group, context),
    runName: renderActionsTemplate(
      workflow["run-name"] ?? workflow.name,
      context,
    ),
    checks,
  };
}

for (const [field, from, metadataOnly] of [
  ["body", "Old description", true],
  ["title", "ci: old title", true],
  ["base", { ref: { from: "old-base" } }, false],
]) {
  test(`PR ${field} edit ${metadataOnly ? "runs only metadata validation" : "runs full CI"}`, () => {
    const synchronized = route(ci, "synchronize", {});
    const changes = { [field]: typeof from === "string" ? { from } : from };
    const edit = route(ci, "edited", changes);
    const validation = route(metadata, "edited", changes);

    assert.notEqual(validation.group, synchronized.group);
    assert.deepEqual(validation.checks, [{ name: "PR metadata", runs: true }]);
    if (metadataOnly) {
      assert.notEqual(edit.group, synchronized.group);
      assert.equal(edit.runName, "CI metadata-only event");
      assert.ok(
        edit.checks.every(({ name, runs }) => name !== "Verify" && !runs),
      );
    } else {
      assert.deepEqual(edit, synchronized);
    }
  });
}

test("new commits run full CI and publish both merge check contexts", () => {
  const synchronized = route(ci, "synchronize", {});
  assert.equal(ci.concurrency["cancel-in-progress"], true);
  assert.deepEqual(
    synchronized.checks.find(({ name }) => name === "Verify"),
    { name: "Verify", runs: true },
  );
  assert.ok(synchronized.checks.every(({ runs }) => runs));

  for (const action of ["opened", "reopened", "synchronize"]) {
    assert.deepEqual(route(ci, action, {}), synchronized);
    assert.deepEqual(route(metadata, action, {}).checks, [
      { name: "PR metadata", runs: true },
    ]);
  }
});

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
    const directory = mkdtempSync(join(tmpdir(), "pr-metadata-"));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const eventPath = join(directory, "event.json");
    const event = {
      action: "edited",
      changes: {
        [field]: {
          from: field === "title" ? "ci: old title" : "Old description",
        },
      },
      pull_request: { title, body },
    };
    writeFileSync(eventPath, JSON.stringify(event));

    const job = Object.values(metadata.jobs).find(
      ({ name }) => name === "PR metadata",
    );
    const [installDependencies, ...validationSteps] = job.steps.filter(
      ({ run }) => run,
    );
    assert.equal(installDependencies.run, "pnpm install --frozen-lockfile");
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
        env: { ...process.env, ...env, GITHUB_EVENT_PATH: eventPath },
        encoding: "utf8",
      });
      assert.ifError(result.error);
      if (result.status !== 0) failures.push(result);
    }
    assert.equal(failures.length, 1);
    assert.equal(failures[0].status, 1);
    assert.match(failures[0].stdout + failures[0].stderr, error);
  });
}
