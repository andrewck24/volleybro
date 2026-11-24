import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { assessReadiness, parseGhOutput } from "../pr-wait.js";

const head = "abc123";
const open = { state: "OPEN", headRefOid: head, mergeStateStatus: "CLEAN" };
const passing = [
  { name: "Verify", state: "SUCCESS" },
  { name: "Vercel", state: "SUCCESS" },
  { name: "PR metadata", state: "SUCCESS" },
];

function runPrWait(t, pr, checks) {
  const directory = mkdtempSync(join(tmpdir(), "pr-wait-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(
    join(directory, "gh"),
    `#!/usr/bin/env node
console.log(JSON.stringify(process.argv[3] === "view" ? ${JSON.stringify(pr)} : ${JSON.stringify(checks)}));
`,
    { mode: 0o755 },
  );

  const script = fileURLToPath(new URL("../pr-wait.js", import.meta.url));
  return spawnSync(
    process.execPath,
    [script, "123", "--head", head, "--interval", "0.01", "--timeout", "0.1"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${directory}${delimiter}${process.env.PATH}`,
      },
    },
  );
}

test("exits ready and reports non-required checks when GitHub reports UNSTABLE", (t) => {
  const pr = { ...open, mergeStateStatus: "UNSTABLE" };
  const link = "https://example.com/ui-tests";
  const result = runPrWait(t, pr, [
    ...passing,
    { name: "Chromatic", state: "PENDING" },
    { name: "UI Tests", state: "FAILURE", link },
    { name: "Preview comment", state: "SUCCESS" },
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Chromatic is PENDING/);
  assert.match(result.stdout, /Preview comment is SUCCESS/);
  assert.match(result.stdout, /ready: abc123/);
  assert.ok(result.stderr.includes(`warning: UI Tests is FAILURE: ${link}`));
});

test("waits while the aggregate Verify check does not exist yet", () => {
  const checks = [{ name: "Vercel", state: "SUCCESS" }];
  const result = assessReadiness({ checks, pr: open, head });
  assert.equal(result.status, "wait");
  assert.match(result.reason, /Verify/);
});

test("waits for GitHub to settle the merge state after checks pass", () => {
  const pr = { ...open, mergeStateStatus: "UNKNOWN" };
  assert.equal(assessReadiness({ checks: passing, pr, head }).status, "wait");
});

test("exits 1 when a required check fails", (t) => {
  const pr = { ...open, mergeStateStatus: "UNSTABLE" };
  const result = runPrWait(t, pr, [{ name: "Verify", state: "FAILURE" }]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not mergeable: Verify is FAILURE/);
});

test("fails closed when the head moves away from the pinned revision", () => {
  const pr = { ...open, headRefOid: "def456" };
  const result = assessReadiness({ checks: passing, pr, head });
  assert.equal(result.status, "fail");
  assert.match(result.reason, /head moved/);
});

test("a branch behind main fails with the step that unblocks it", () => {
  const pr = { ...open, mergeStateStatus: "BEHIND" };
  const result = assessReadiness({ checks: passing, pr, head });
  assert.equal(result.status, "fail");
  assert.match(result.reason, /merge origin\/main/);
});

test("a merged pull request needs no wait", () => {
  const pr = { ...open, state: "MERGED" };
  assert.equal(assessReadiness({ checks: [], pr, head }).status, "merged");
});

test("a failed Vercel check, a conflict or a closed PR fails closed", () => {
  const vercelFailed = [
    { name: "Verify", state: "SUCCESS" },
    { name: "Vercel", state: "FAILURE" },
  ];
  assert.equal(
    assessReadiness({ checks: vercelFailed, pr: open, head }).status,
    "fail",
  );
  for (const pr of [
    { ...open, mergeStateStatus: "DIRTY" },
    { ...open, state: "CLOSED" },
  ]) {
    assert.equal(assessReadiness({ checks: passing, pr, head }).status, "fail");
  }
});

const ciCheck = (run, name, state, event = "pull_request") => ({
  name,
  state,
  event,
  workflow: "CI",
  link: `https://github.com/o/r/actions/runs/${run}/job/${run}${name.length}`,
});
const metadataCheck = (run, state) => ({
  name: "PR metadata",
  state,
  event: "pull_request",
  workflow: "PR metadata",
  link: `https://github.com/o/r/actions/runs/${run}/job/${run}1`,
});
const vercel = { name: "Vercel", state: "SUCCESS", workflow: "", link: "" };

test("an older successful Verify cannot satisfy a new CI run without Verify", () => {
  const checks = [
    ciCheck(100, "Verify", "SUCCESS"),
    ciCheck(101, "Test", "QUEUED"),
    vercel,
  ];
  const result = assessReadiness({ checks, pr: open, head });
  assert.equal(result.status, "wait");
  assert.match(result.reason, /Verify/);
});

test("only the newest pull_request run's Verify decides", () => {
  for (const [olderState, newerState, status] of [
    ["CANCELLED", "SUCCESS", "ready"],
    ["SUCCESS", "FAILURE", "fail"],
    ["SUCCESS", "CANCELLED", "fail"],
  ]) {
    const latest = ciCheck(101, "Verify", newerState);
    const checks = [
      ciCheck(100, "Verify", olderState),
      latest,
      vercel,
      metadataCheck(50, "SUCCESS"),
    ];
    const result = assessReadiness({ checks, pr: open, head });
    assert.equal(result.status, status);
    if (status === "fail") {
      assert.equal(result.reason, `Verify is ${newerState}: ${latest.link}`);
    }
  }
});

test("a dispatched run on the same head does not replace the pull_request run", () => {
  const checks = [
    ciCheck(100, "Verify", "FAILURE"),
    ciCheck(101, "Verify", "SUCCESS", "workflow_dispatch"),
    vercel,
  ];
  assert.equal(assessReadiness({ checks, pr: open, head }).status, "fail");
});

test("any failed Vercel entry fails whatever order gh lists them in", () => {
  const failed = { ...vercel, state: "FAILURE" };
  const verify = ciCheck(100, "Verify", "SUCCESS");
  for (const checks of [
    [vercel, failed, verify],
    [failed, vercel, verify],
  ]) {
    assert.deepEqual(assessReadiness({ checks, pr: open, head }), {
      status: "fail",
      reason: "Vercel is FAILURE",
    });
  }
});

test("a failed PR metadata check fails with its link", () => {
  const failed = metadataCheck(200, "FAILURE");
  const checks = [ciCheck(100, "Verify", "SUCCESS"), vercel, failed];
  assert.deepEqual(assessReadiness({ checks, pr: open, head }), {
    status: "fail",
    reason: `PR metadata is FAILURE: ${failed.link}`,
  });
});

test("a pending PR metadata check makes pr:wait wait and name it", () => {
  const checks = [
    ciCheck(100, "Verify", "SUCCESS"),
    vercel,
    metadataCheck(200, "PENDING"),
  ];
  const result = assessReadiness({ checks, pr: open, head });
  assert.equal(result.status, "wait");
  assert.match(result.reason, /PR metadata/);
});

test("gh output before the first check is reported reads as no checks", () => {
  assert.deepEqual(parseGhOutput(""), []);
  assert.deepEqual(parseGhOutput('[{"name":"Verify","state":"PENDING"}]\n'), [
    { name: "Verify", state: "PENDING" },
  ]);
});
