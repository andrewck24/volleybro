import assert from "node:assert/strict";
import test from "node:test";

import { LANE_AFTER, LANE_NAMES, planLanes } from "../verify.js";

test("full run requested runs every lane", () => {
  const plan = planLanes(["src/foo.ts"], { all: true, full: true });
  for (const lane of Object.keys(plan)) {
    assert.equal(plan[lane].run, true);
    assert.equal(plan[lane].reason, "full run requested");
  }
});

test("unresolved merge-base runs every lane", () => {
  const plan = planLanes(null, { all: true });
  for (const lane of Object.keys(plan)) {
    assert.equal(plan[lane].run, true);
    assert.equal(plan[lane].reason, "no merge-base with dev");
  }
});

test("root config change runs every lane and names the path", () => {
  const plan = planLanes(["src/foo.ts", "package.json"], { all: true });
  for (const lane of Object.keys(plan)) {
    assert.equal(plan[lane].run, true);
    assert.equal(plan[lane].reason, "package.json changed");
  }
});

test("blueprint-only diff runs only static and blueprint", () => {
  const plan = planLanes(["blueprint/content/x.mdx"], { all: true });
  assert.equal(plan.static.run, true);
  assert.equal(plan.blueprint.run, true);
  assert.equal(plan.blueprint.reason, "blueprint/content/x.mdx changed");
  assert.equal(plan["app-test"].run, false);
  assert.equal(plan["app-build"].run, false);
});

test("app-only diff runs static, app-test and app-build, not blueprint", () => {
  const plan = planLanes(["src/foo.ts"], { all: true });
  assert.equal(plan.static.run, true);
  assert.equal(plan["app-test"].run, true);
  assert.equal(plan["app-test"].reason, "src/foo.ts changed");
  assert.equal(plan["app-build"].run, true);
  assert.equal(plan.blueprint.run, false);
});

test("docs-only diff runs only static", () => {
  const plan = planLanes(["docs/testing-strategy.md"], { all: true });
  assert.equal(plan.static.run, true);
  assert.equal(plan["app-test"].run, false);
  assert.equal(plan["app-build"].run, false);
  assert.equal(plan.blueprint.run, false);
});

test("a markdown file inside src counts as docs", () => {
  const plan = planLanes(["src/components/README.md"], { all: true });
  assert.equal(plan.static.run, true);
  assert.equal(plan["app-test"].run, false);
  assert.equal(plan["app-build"].run, false);
  assert.equal(plan.blueprint.run, false);
});

test("default (non --all) mode ignores scoping", () => {
  const plan = planLanes(["docs/testing-strategy.md"], { all: false });
  assert.equal(plan.static.run, true);
  assert.equal(plan["app-test"].run, true);
  assert.equal(plan["app-build"].run, false);
  assert.equal(plan.blueprint.run, false);
});

test("root config patterns and shared directories widen to every lane", () => {
  for (const changed of [
    "tsconfig.json",
    "eslint.config.mjs",
    "scripts/x.js",
    ".github/workflows/ci.yml",
  ]) {
    const plan = planLanes(["docs/a.md", changed], { all: true });
    for (const lane of LANE_NAMES) assert.equal(plan[lane].run, true, changed);
  }
  assert.equal(
    planLanes(["src/tsconfig.json"], { all: true }).blueprint.run,
    false,
  );
});

test("a lane's prerequisite is started before it", () => {
  for (const [lane, before] of Object.entries(LANE_AFTER)) {
    assert.ok(
      LANE_NAMES.indexOf(before) < LANE_NAMES.indexOf(lane),
      `${before} must precede ${lane}`,
    );
  }
});
