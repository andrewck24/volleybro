import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const sha = "0123456789abcdef";

const run = (command) =>
  spawnSync(
    "node",
    [new URL("../guard-pr-merge.js", import.meta.url).pathname],
    { input: JSON.stringify({ tool_input: { command } }), encoding: "utf8" },
  ).stdout;

const assertDenied = (command, reason) => {
  const output = JSON.parse(run(command)).hookSpecificOutput;
  assert.equal(output.permissionDecision, "deny", command);
  assert.match(output.permissionDecisionReason, reason, command);
};

test("allows an exact-head merge and unrelated commands", () => {
  for (const c of [
    `gh pr merge --merge --match-head-commit ${sha}`,
    `gh pr merge 12 --merge --match-head-commit ${sha}`,
    "gh pr view 12",
    "pnpm pr:wait 12 --head abc",
  ]) {
    assert.equal(run(c), "", c);
  }
});

test("denies --auto and a merge without --match-head-commit", () => {
  for (const c of [
    `gh pr merge 012 --merge --match-head-commit ${sha}`,
    `gh pr merge 12a --merge --match-head-commit ${sha}`,
    `gh pr merge 12 --auto --merge --match-head-commit ${sha}`,
    "gh pr merge 12 --merge",
    "GH_HOST=github.com gh pr merge 1",
    "env gh pr merge 1",
    "GH_HOST=github.com env gh pr merge 1",
    "env -- gh pr merge 1",
    "command gh pr merge 1",
    "(gh pr merge 1)",
    "if true; then gh pr merge 1; fi",
    "while gh pr merge 1; do break; done",
    "until gh pr merge 1; do break; done",
    "{ gh pr merge 1; }",
    "gh \\\npr merge 1",
    "gh pr mer\\\nge 1",
    "gh pr merge --auto --squash",
    "gh pr merge 12 --match-head-commit --merge",
    `gh pr merge 1 --merge; gh pr merge 2 --match-head-commit ${sha}`,
    `gh pr merge 1 --match-head-commit ${sha} && gh pr merge 2 --merge`,
    "gh pr merge 1 --merge\ngh pr view 1",
    "gh pr merge 1 --match-head-commit=",
    "cd x && gh  pr merge 12 --merge --match-head-commit",
  ]) {
    assertDenied(c, /pnpm pr:wait/);
  }
});

test("hook entry point fails closed on invalid stdin", () => {
  const r = spawnSync(
    "node",
    [new URL("../guard-pr-merge.js", import.meta.url).pathname],
    { input: "not json", encoding: "utf8" },
  );
  assert.equal(r.status, 2);
  assert.match(r.stderr, /not valid JSON/);
});

test("denies quoted or escaped merge intent", () => {
  for (const c of [
    'echo "gh pr merge 1"',
    "echo 'gh api repos/a/b/pulls/1/merge -X PUT'",
    'echo "hello; gh pr merge 1"',
  ])
    assertDenied(c, /plain pinned merge/);
  assertDenied("echo gh\\ pr\\ merge\\ 1", /plain pinned merge/);
});

test("denies GitHub API merges regardless of flag order", () => {
  for (const c of [
    "gh api repos/a/b/pulls/1/merge --method PUT",
    "gh api -X PUT repos/a/b/pulls/1/merge",
    "gh api --method=PUT repos/a/b/pulls/1/merge -f sha=",
  ])
    assertDenied(c, /plain pinned merge/);
  assertDenied(
    `gh api repos/a/b/pulls/1/merge --method PUT -f sha=${sha}`,
    /plain pinned merge/,
  );
});

test("denies merge commands with ambiguous shell syntax or options", () => {
  for (const c of [
    "gh pr merge 1 # --match-head-commit abc",
    "gh api repos/a/b/pulls/1/merge -XPUT",
    "gh api repos/a/b/pulls/1/merge -X PUT --jq --method=GET",
    "> /tmp/merge-log gh pr merge 1",
    "gh pr merge 1 --match-head-commit $HEAD",
    "env -i gh pr merge 1",
    "command env gh pr merge 1",
    "gh pr 'merge' 1",
    'gh pr m"erge" 1',
    'gh api repos/a/b/pulls/1/"merge" --method PUT',
    "gh pr merge 1 --merge --match-head-commit *",
  ])
    assertDenied(c, /pnpm pr:wait/);
});
