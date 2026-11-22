import assert from "node:assert/strict";
import test from "node:test";

import { assessReadiness, parseGhOutput } from "../pr-wait.js";

const head = "abc123";
const open = { state: "OPEN", headRefOid: head, mergeStateStatus: "CLEAN" };
const passing = [
  { name: "Verify", state: "SUCCESS" },
  { name: "Vercel", state: "SUCCESS" },
  { name: "PR metadata", state: "SUCCESS" },
  { name: "Chromatic", state: "PENDING" },
];

test("ready once Verify, Vercel and PR metadata pass on the pinned head and GitHub reports CLEAN", () => {
  assert.deepEqual(assessReadiness({ checks: passing, pr: open, head }), {
    status: "ready",
  });
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

test("fails closed when a required check fails or is cancelled", () => {
  for (const state of ["FAILURE", "CANCELLED"]) {
    const checks = [{ name: "Verify", state }];
    const result = assessReadiness({ checks, pr: open, head });
    assert.equal(result.status, "fail");
    assert.match(result.reason, new RegExp(`Verify is ${state}`));
  }
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
