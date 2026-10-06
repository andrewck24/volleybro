import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReleasePrBody,
  changelogEntryForVersion,
  MAX_GITHUB_PR_BODY_CHARS,
} from "../release-pr-body.js";

test("release PR body includes this version's notes, not oversized history", () => {
  const history =
    "Historical release notes must not leak into this PR.\n".repeat(1_300);
  const changelog = [
    "# VolleyBro CHANGELOG",
    "",
    "## [0.16.3](https://example.test/compare/v0.16.2...v0.16.3) 2026-10-06",
    "",
    "### Security",
    "- Fix the current authentication issue.",
    "",
    "## [0.16.2](https://example.test/compare/v0.16.1...v0.16.2) 2026-10-01",
    "",
    history,
  ].join("\n");

  const body = buildReleasePrBody({
    packageName: "volleybro",
    version: "0.16.3",
    changelog,
  });

  assert.match(body, /## volleybro@0\.16\.3/);
  assert.match(body, /Fix the current authentication issue\./);
  assert.doesNotMatch(body, /Historical release notes/);
  assert.ok(body.length < MAX_GITHUB_PR_BODY_CHARS);
});

test("release PR body supports an unlinked Changesets version heading", () => {
  const changelog = "# Changes\n\n## 1.2.3\n\n- Current note.\n";

  assert.equal(changelogEntryForVersion(changelog, "1.2.3"), "- Current note.");
});

test("release PR body fails closed if the current entry exceeds GitHub's limit", () => {
  const changelog = [
    "# Changes",
    "",
    "## [1.2.3](https://example.test) 2026-10-06",
    "",
    "x".repeat(MAX_GITHUB_PR_BODY_CHARS),
  ].join("\n");

  assert.throws(
    () =>
      buildReleasePrBody({
        packageName: "fixture",
        version: "1.2.3",
        changelog,
      }),
    /exceed GitHub's 60000-character PR body limit/,
  );
});

test("release PR body fails when the current version is absent", () => {
  assert.throws(
    () =>
      buildReleasePrBody({
        packageName: "fixture",
        version: "1.2.3",
        changelog: "# Changes\n\n## 1.2.2\n\n- Older note.\n",
      }),
    /has no version heading for 1\.2\.3/,
  );
});
