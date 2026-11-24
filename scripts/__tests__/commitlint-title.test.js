import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

function lintTitle(title) {
  return spawnSync(
    process.execPath,
    [
      "node_modules/@commitlint/cli/cli.js",
      "--config",
      "commitlint.title.config.js",
    ],
    { cwd: repoRoot, input: title, encoding: "utf8" },
  );
}

test("a pull request title longer than a commit subject's limit passes", () => {
  const title =
    "chore(deps): bump chromaui/action from 18.15.0 to 18.15.1 in the minor-patch group across 1 directory";
  assert.ok(title.length > 100);
  const result = lintTitle(title);
  assert.equal(result.status, 0, result.stdout);
});

test("a pull request title with an unknown type still fails", () => {
  const result = lintTitle("bump(deps): update chromaui/action");
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /type-enum/);
});
