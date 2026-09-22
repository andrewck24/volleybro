import assert from "node:assert/strict";
import test from "node:test";

import { parseTrailers, getTrailer } from "../commitlint/trailers.js";
import { evaluateChangeBranchTrailer } from "../commitlint/change-branch.js";
import { evaluateAiAttribution } from "../commitlint/ai-attribution.js";

// --- trailers.js -----------------------------------------------------------

test("parseTrailers reads a well-formed trailer block", () => {
  const message =
    "feat(x): subject\n\nbody paragraph.\n\nBlueprint-Change: my-slug\nRefs: VLB-1";
  const trailers = parseTrailers(message);
  assert.equal(getTrailer(trailers, "Blueprint-Change"), "my-slug");
  assert.equal(getTrailer(trailers, "Refs"), "VLB-1");
});

test("parseTrailers ignores 'Blueprint-Change:' appearing in prose, not the last paragraph", () => {
  const message =
    "feat(x): subject\n\nthis body mentions Blueprint-Change: not-a-trailer inline.\n\nRefs: VLB-1";
  const trailers = parseTrailers(message);
  assert.equal(getTrailer(trailers, "Blueprint-Change"), undefined);
});

test("parseTrailers returns nothing when the last paragraph is plain prose", () => {
  const message =
    "feat(x): subject\n\njust a closing sentence, no trailers here.";
  assert.equal(parseTrailers(message).size, 0);
});

test("parseTrailers folds continuation lines into the trailer above them", () => {
  const message =
    "feat(x): subject\n\nbody.\n\nBlueprint-Change: my-slug\n more on the same trailer";
  const trailers = parseTrailers(message);
  assert.equal(
    getTrailer(trailers, "Blueprint-Change"),
    "my-slug more on the same trailer",
  );
});

// --- change-branch.js (the 8 Proposal scenarios that are mechanical) -------

test("scenario: missing trailer on a Change branch is rejected naming 'missing'", () => {
  const verdict = evaluateChangeBranchTrailer(
    "feat/my-slug",
    "feat(x): subject\n\nbody.",
  );
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, "missing");
  assert.match(verdict.message, /hotfix\/my-slug/);
});

test("scenario: trailer naming a different slug is rejected naming 'mismatch'", () => {
  const message = "feat(x): subject\n\nbody.\n\nBlueprint-Change: wrong-slug";
  const verdict = evaluateChangeBranchTrailer("feat/my-slug", message);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, "mismatch");
});

test("scenario: matching trailer on a Change branch passes", () => {
  const message = "feat(x): subject\n\nbody.\n\nBlueprint-Change: my-slug";
  assert.deepEqual(evaluateChangeBranchTrailer("feat/my-slug", message), {
    ok: true,
  });
});

test("scenario: fix/ and refactor/ branches are Change branches too", () => {
  assert.equal(
    evaluateChangeBranchTrailer("fix/my-slug", "fix(x): subject\n\nbody.").ok,
    false,
  );
  assert.equal(
    evaluateChangeBranchTrailer(
      "refactor/my-slug",
      "refactor(x): subject\n\nbody.",
    ).ok,
    false,
  );
});

test("scenario: no trailer on dev, hotfix/*, or any other non-Change branch passes", () => {
  const message = "chore(x): subject\n\nbody.";
  for (const branch of [
    "dev",
    "hotfix/my-slug",
    "chore/tidy",
    "docs/notes",
    "claude/worktree-1",
  ]) {
    assert.deepEqual(evaluateChangeBranchTrailer(branch, message), {
      ok: true,
    });
  }
});

test("scenario: an empty/unknown branch (detached HEAD) skips the rule silently", () => {
  assert.deepEqual(
    evaluateChangeBranchTrailer("", "feat(x): subject\n\nbody."),
    { ok: true },
  );
});

// --- ai-attribution.js ------------------------------------------------------

test("scenario: a Co-Authored-By trailer naming an AI assistant is rejected", () => {
  const message =
    "feat(x): subject\n\nbody.\n\nCo-Authored-By: Claude <noreply@anthropic.com>";
  assert.equal(evaluateAiAttribution(message).ok, false);
});

test("a Co-Authored-By trailer naming a human passes", () => {
  const message =
    "feat(x): subject\n\nbody.\n\nCo-Authored-By: Jane Doe <jane@example.com>";
  assert.deepEqual(evaluateAiAttribution(message), { ok: true });
});

test("a 'Generated with/by' line naming an AI assistant is rejected", () => {
  const message = "feat(x): subject\n\nbody.\n\nGenerated with Claude Code.";
  assert.equal(evaluateAiAttribution(message).ok, false);
});

test("plain prose mentioning none of the AI names passes", () => {
  const message =
    "feat(x): subject\n\nbody explaining why, no attribution here.";
  assert.deepEqual(evaluateAiAttribution(message), { ok: true });
});
