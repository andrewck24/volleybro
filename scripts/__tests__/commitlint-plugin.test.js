import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  evaluateChangeBranchTrailer,
  evaluateAiAttribution,
  evaluateScopeDenyList,
} from "../commitlint/plugin.js";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

function runCommitlint(message, branch) {
  try {
    execFileSync("node_modules/.bin/commitlint", [], {
      cwd: repoRoot,
      input: message,
      env: { ...process.env, COMMITLINT_BRANCH: branch },
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, output: error.stdout?.toString() ?? "" };
  }
}

// --- Blueprint-Change trailer ----------------------------------------------

test("missing trailer on a Change branch is rejected, naming hotfix/<slug>", () => {
  const verdict = evaluateChangeBranchTrailer(
    "feat/my-slug",
    "feat(x): subject\n\nbody.",
  );
  assert.equal(verdict.ok, false);
  assert.match(verdict.message, /hotfix\/my-slug/);
});

test("a trailer naming a different slug is rejected, distinct from a missing one", () => {
  const message = "feat(x): subject\n\nbody.\n\nBlueprint-Change: wrong-slug";
  const verdict = evaluateChangeBranchTrailer("feat/my-slug", message);
  assert.equal(verdict.ok, false);
  assert.match(verdict.message, /carries "Blueprint-Change: wrong-slug"/);
});

test("a matching trailer on a Change branch passes", () => {
  const message = "feat(x): subject\n\nbody.\n\nBlueprint-Change: my-slug";
  assert.deepEqual(evaluateChangeBranchTrailer("feat/my-slug", message), {
    ok: true,
  });
});

test("a trailer with no space after the colon still matches, per git's own parsing", () => {
  const message = "feat(x): subject\n\nbody.\n\nBlueprint-Change:my-slug";
  assert.deepEqual(evaluateChangeBranchTrailer("feat/my-slug", message), {
    ok: true,
  });
});

test("a trailer block mixed with Signed-off-by is still read correctly", () => {
  const message =
    "feat(x): subject\n\nbody.\n\nSigned-off-by: A <a@b.com>\nBlueprint-Change: my-slug";
  assert.deepEqual(evaluateChangeBranchTrailer("feat/my-slug", message), {
    ok: true,
  });
});

test("fix/ and refactor/ branches are Change branches too", () => {
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

test("no trailer on dev, hotfix/*, or any other non-Change branch passes", () => {
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

test("an empty/unknown branch (detached HEAD) skips the rule silently", () => {
  assert.deepEqual(
    evaluateChangeBranchTrailer("", "feat(x): subject\n\nbody."),
    { ok: true },
  );
});

// --- AI attribution ----------------------------------------------------------

test("a Co-Authored-By trailer naming an AI assistant is rejected, case-insensitively", () => {
  const message =
    "feat(x): subject\n\nbody.\n\nco-authored-by: Claude <noreply@anthropic.com>";
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

// --- scope deny list -----------------------------------------------------

test("a denied scope is rejected, case-insensitively", () => {
  const verdict = evaluateScopeDenyList("OpenSpec", ["spectra", "openspec"]);
  assert.equal(verdict.ok, false);
  assert.match(verdict.message, /openspec/);
});

test("a scope not on the deny list passes", () => {
  assert.deepEqual(
    evaluateScopeDenyList("delivery-workflow", ["spectra", "openspec"]),
    {
      ok: true,
    },
  );
});

test("no scope at all passes", () => {
  assert.deepEqual(evaluateScopeDenyList(undefined, ["spectra", "openspec"]), {
    ok: true,
  });
});

// --- config-level: defaultIgnores off, merge commits still exempt ----------

test("a default revert message on a Change branch is rejected, not ignored", () => {
  const verdict = runCommitlint(
    'Revert "feat(x): subject"\n\nThis reverts commit abc123.\n',
    "feat/commit-guardrails",
  );
  assert.equal(verdict.ok, false);
  assert.match(verdict.output, /blueprint-change-trailer/);
});

test("a merge commit is still ignored", () => {
  const verdict = runCommitlint(
    "Merge pull request #1 from x/y\n",
    "feat/commit-guardrails",
  );
  assert.deepEqual(verdict, { ok: true });
});
