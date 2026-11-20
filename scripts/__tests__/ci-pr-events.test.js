import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
      condition?.includes("always()") ||
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

const synchronized = route(ci, "synchronize", {});

for (const [field, from, metadataOnly] of [
  ["body", "Old description", true],
  ["title", "ci: old title", true],
  ["base", { ref: { from: "old-base" } }, false],
]) {
  test(`PR ${field} edit ${metadataOnly ? "runs only metadata validation" : "runs full CI"}`, () => {
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
