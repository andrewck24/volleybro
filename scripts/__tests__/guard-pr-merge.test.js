import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { checkPrMerge } from "../guard-pr-merge.js";

const sha = "0123456789abcdef";

test("allows an exact-head merge and unrelated commands", () => {
  for (const c of [
    `gh pr merge 12 --merge --match-head-commit ${sha}`,
    `gh pr merge 12 --merge --match-head-commit=${sha}`,
    "gh pr view 12",
    "pnpm pr:wait 12 --head abc",
  ]) {
    assert.equal(checkPrMerge(c), null, c);
  }
});

test("denies --auto and a merge without --match-head-commit", () => {
  for (const c of [
    `gh pr merge 12 --auto --merge --match-head-commit ${sha}`,
    "gh pr merge 12 --merge",
    "gh pr merge --auto --squash",
    "gh pr merge 12 --match-head-commit --merge",
    "cd x && gh  pr merge 12 --merge --match-head-commit",
  ]) {
    assert.match(checkPrMerge(c), /pnpm pr:wait/, c);
  }
});

test("hook entry point emits a deny decision from stdin JSON", () => {
  const run = (command) =>
    spawnSync(
      "node",
      [new URL("../guard-pr-merge.js", import.meta.url).pathname],
      {
        input: JSON.stringify({ tool_input: { command } }),
        encoding: "utf8",
      },
    ).stdout;
  assert.equal(run(`gh pr merge 1 --match-head-commit ${sha}`), "");
  assert.equal(
    JSON.parse(run("gh pr merge 1 --auto")).hookSpecificOutput
      .permissionDecision,
    "deny",
  );
});
