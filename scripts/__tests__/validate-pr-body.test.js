import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { validatePrBody } from "../validate-pr-body.js";

const mergedPullRequests = JSON.parse(
  readFileSync(new URL("./fixtures/pr-bodies.json", import.meta.url), "utf8"),
);
const SUMMARY_ERROR = "End the PR description with a ## 摘要 section.";

for (const fixture of mergedPullRequests) {
  const { number, body, headRef } = fixture;
  if (number === 765) {
    test("PR #765 has the summary but omitted its Fast path marker", () => {
      assert.equal(
        validatePrBody({ body, headRef: "fix/sets-page" }),
        undefined,
      );
      assert.equal(
        validatePrBody({ body, headRef }),
        'Mention "Fast path" in the PR description.',
      );
      assert.equal(
        validatePrBody({ body: `Fast path.\n\n${body}`, headRef }),
        undefined,
      );
    });
  } else {
    test(`accepts the merged body from PR #${number}`, () => {
      assert.equal(validatePrBody({ body, headRef }), undefined);
    });
  }
}

test("preserves the empty-body error for whitespace-only descriptions", () => {
  assert.equal(
    validatePrBody({ body: " \n\t ", headRef: "fix/example" }),
    "Enter a PR description or release notes.",
  );
});

test("requires a real Markdown summary heading", () => {
  const body = "A PR description\n\n```md\n## 摘要\n```";
  assert.equal(validatePrBody({ body, headRef: "fix/example" }), SUMMARY_ERROR);
});

test("rejects an h2 section after the summary", () => {
  const body = "## 摘要\n\n修正說明。\n\n## Evidence\n\nVerification.";
  assert.equal(validatePrBody({ body, headRef: "fix/example" }), SUMMARY_ERROR);
});

test("accepts a subsection within the final summary", () => {
  const body = "## 摘要\n\n修正說明。\n\n### 驗證\n\n測試通過。";
  assert.equal(validatePrBody({ body, headRef: "fix/example" }), undefined);
});

test("exempts Dependabot-authored descriptions from the summary rule", () => {
  const pr = {
    body: "Bumps the minor-patch group.",
    headRef: "dependabot/npm_and_yarn/minor-patch",
  };
  assert.equal(
    validatePrBody({ ...pr, authorLogin: "dependabot[bot]" }),
    undefined,
  );
  assert.equal(
    validatePrBody({ ...pr, authorLogin: "contributor" }),
    SUMMARY_ERROR,
  );
});
