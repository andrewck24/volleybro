import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertBaseline,
  assertExistingTagSha,
  assertHealthySmoke,
  assertRollbackEvidence,
  assertTagSha,
  remoteTagTarget,
  validateAuthorization,
  validateCandidate,
  validateReviewEnvironment,
  validateVersionPr,
  verifyMetadataOnly,
} from "../release-controls.js";

function authorization(overrides = {}) {
  const event = {
    pull_request: {
      merged: true,
      merge_commit_sha: "merge-sha",
      head: { sha: "head-sha" },
    },
  };
  const pr = {
    state: "closed",
    merged: true,
    merge_commit_sha: "merge-sha",
    user: { login: "andrewck24" },
    title: "release: update versions",
    base: { ref: "main", repo: { full_name: "owner/repo" } },
    head: {
      ref: "changeset-release/main",
      sha: "head-sha",
      repo: { full_name: "owner/repo" },
    },
  };
  const checkRuns = [
    {
      name: "Verify",
      head_sha: "head-sha",
      app: { id: 15368 },
      status: "completed",
      conclusion: "success",
      started_at: "2026-10-01T00:00:00Z",
    },
  ];
  const statuses = [
    {
      context: "Vercel",
      state: "success",
      sha: "head-sha",
      updated_at: "2026-10-01T00:00:00Z",
    },
    {
      context: "Vercel Preview Comments",
      state: "success",
      sha: "head-sha",
      updated_at: "2026-10-01T00:01:00Z",
    },
  ];
  return {
    event,
    pr,
    expectedAuthor: "andrewck24",
    repository: "owner/repo",
    checkRuns,
    statuses,
    ...overrides,
  };
}

test("only the trusted same-repository version PR with latest required checks authorizes its merge SHA", () => {
  assert.equal(validateAuthorization(authorization()), "merge-sha");
});

test("open PR validator accepts the exact rolling version PR identity without requiring check results", () => {
  const { pr } = authorization();
  pr.state = "open";
  pr.merged = false;
  assert.equal(validateVersionPr(pr, "andrewck24", "owner/repo"), true);
  assert.throws(() => validateVersionPr(pr, "attacker", "owner/repo"));
  assert.throws(() =>
    validateVersionPr(
      { ...pr, title: "release: update versions " },
      "andrewck24",
      "owner/repo",
    ),
  );
});

test("rejects an impersonating author, fork head, title change, or failed latest check", () => {
  const cases = [
    (input) => {
      input.pr.user.login = "attacker";
    },
    (input) => {
      input.pr.head.repo.full_name = "attacker/repo";
    },
    (input) => {
      input.pr.title = "release: update versions!";
    },
    (input) => {
      input.checkRuns.push({
        name: "Verify",
        app: { id: 15368 },
        status: "completed",
        conclusion: "failure",
        started_at: "2026-10-02T00:00:00Z",
      });
    },
  ];
  for (const mutate of cases) {
    const input = authorization();
    mutate(input);
    assert.throws(() => validateAuthorization(input));
  }
});

test("release requires the latest authentic Verify run and exact Vercel status on the head SHA", () => {
  const failures = [
    (input) => {
      input.checkRuns = [];
    },
    (input) => {
      input.checkRuns[0].app.id = 999;
    },
    (input) => {
      input.checkRuns[0].status = "in_progress";
    },
    (input) => {
      input.checkRuns[0].head_sha = "stale-sha";
    },
    (input) => {
      input.statuses = [];
    },
    (input) => {
      input.statuses[0].state = "pending";
    },
    (input) => {
      input.statuses[0].state = "failure";
    },
    (input) => {
      input.statuses = [input.statuses[1]];
    },
    (input) => {
      input.statuses[0].sha = "stale-sha";
    },
  ];
  for (const mutate of failures) {
    const input = authorization();
    mutate(input);
    assert.throws(() => validateAuthorization(input));
  }
  const newerPending = authorization();
  newerPending.statuses.push({
    context: "Vercel",
    state: "pending",
    sha: "head-sha",
    updated_at: "2026-10-02T00:00:00Z",
  });
  assert.throws(
    () => validateAuthorization(newerPending),
    /Vercel commit status/,
  );
});

test("candidate must remain the ready production deployment for the exact SHA with no alias", () => {
  const candidate = {
    id: "dpl_candidate",
    readyState: "READY",
    target: "production",
    meta: { releaseSha: "sha-1" },
    alias: [],
  };
  assert.doesNotThrow(() =>
    validateCandidate(candidate, "dpl_candidate", "sha-1"),
  );
  assert.throws(() =>
    validateCandidate(
      { ...candidate, readyState: "BUILDING" },
      "dpl_candidate",
      "sha-1",
    ),
  );
  assert.throws(() =>
    validateCandidate(
      { ...candidate, meta: { releaseSha: "other" } },
      "dpl_candidate",
      "sha-1",
    ),
  );
  assert.throws(() =>
    validateCandidate(
      { ...candidate, alias: ["volleybro.vercel.app"] },
      "dpl_candidate",
      "sha-1",
    ),
  );
});

test("rejects a stale production baseline at the promotion boundary", () => {
  const original = { deploymentId: "dpl_baseline", updatedAt: "1000" };
  assert.doesNotThrow(() => assertBaseline(original, original));
  assert.throws(
    () =>
      assertBaseline(
        { deploymentId: "dpl_hotfix", updatedAt: "2000" },
        original,
      ),
    /baseline changed/,
  );
  assert.throws(
    () => assertBaseline({ ...original, updatedAt: "3000" }, original),
    /baseline changed/,
  );
});

test("rollback requires compatibility evidence bound to the exact baseline, candidate, and SHA", () => {
  const state = {
    baseline: { deploymentId: "dpl_old" },
    candidateId: "dpl_new",
    sha: "sha-1",
  };
  assert.doesNotThrow(() =>
    assertRollbackEvidence("dpl_old:dpl_new:sha-1", state),
  );
  assert.throws(() => assertRollbackEvidence("", state));
  assert.throws(() => assertRollbackEvidence("dpl_old:dpl_new:sha-2", state));
});

test("release stops unless candidate QA environment has a required reviewer", () => {
  assert.doesNotThrow(() =>
    validateReviewEnvironment({
      protection_rules: [
        { type: "required_reviewers", reviewers: [{ login: "release-owner" }] },
      ],
    }),
  );
  assert.throws(
    () => validateReviewEnvironment({ protection_rules: [] }),
    /required reviewers/,
  );
  assert.throws(
    () =>
      validateReviewEnvironment({
        protection_rules: [{ type: "wait_timer", wait_timer: 5 }],
      }),
    /required reviewers/,
  );
});

test("tag retry is idempotent at the authorized SHA and rejects a moved tag", () => {
  assert.doesNotThrow(() => assertTagSha("sha-1", "sha-1", "v1.0.0"));
  assert.throws(
    () => assertTagSha("sha-other", "sha-1", "v1.0.0"),
    /different commit/,
  );
  assert.doesNotThrow(() => assertTagSha("", "sha-1", "v1.0.0"));
  assert.equal(
    remoteTagTarget(
      "sha-tag\trefs/tags/v1.0.0\nsha-1\trefs/tags/v1.0.0^{}",
      "v1.0.0",
    ),
    "sha-1",
  );
  assert.throws(
    () => assertExistingTagSha("", "sha-1", "v1.0.0"),
    /verify remote target/,
  );
  assert.doesNotThrow(() => assertExistingTagSha("sha-1", "sha-1", "v1.0.0"));
});

test("rollback verification requires a healthy baseline homepage response", () => {
  assert.doesNotThrow(() => assertHealthySmoke(200, "baseline"));
  assert.throws(() => assertHealthySmoke(503, "baseline"), /HTTP 503/);
});

test("metadata diff accepts version/changelog/consumed changeset only and rejects runtime changes", async () => {
  const previousCwd = process.cwd();
  const directory = await mkdtemp(join(tmpdir(), "release-controls-"));
  const git = (...args) =>
    execFileSync("git", args, { cwd: directory, encoding: "utf8" }).trim();
  try {
    process.chdir(directory);
    git("init", "-q");
    git("config", "user.name", "Release Test");
    git("config", "user.email", "release-test@example.invalid");
    await mkdir(".changeset");
    await writeFile("package.json", '{"name":"volleybro","version":"1.0.0"}\n');
    await writeFile("CHANGELOG.md", "# Changelog\n");
    await writeFile(
      ".changeset/one.md",
      '---\n"volleybro": patch\n---\n\nFix.\n',
    );
    await writeFile("runtime.js", "export const value = 1;\n");
    git("add", ".");
    git("commit", "-qm", "base");
    const base = git("rev-parse", "HEAD");
    await writeFile("package.json", '{"name":"volleybro","version":"1.0.1"}\n');
    await writeFile("CHANGELOG.md", "# Changelog\n\n## 1.0.1\n\nFix.\n");
    await rm(".changeset/one.md");
    git("add", "-A");
    git("commit", "-qm", "version");
    const valid = git("rev-parse", "HEAD");
    await assert.doesNotReject(() => verifyMetadataOnly(base, valid));
    await writeFile("runtime.js", "export const value = 2;\n");
    git("add", "runtime.js");
    git("commit", "-qm", "runtime change");
    const invalid = git("rev-parse", "HEAD");
    await assert.rejects(
      () => verifyMetadataOnly(base, invalid),
      /non-metadata change/,
    );
  } finally {
    process.chdir(previousCwd);
    await rm(directory, { recursive: true, force: true });
  }
});
