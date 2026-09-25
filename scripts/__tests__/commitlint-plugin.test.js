import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  evaluateChangeBranchTrailer,
  evaluateAiAttribution,
  evaluateFooterLookalike,
} from "../commitlint/plugin.js";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

function runCommitlint(message, branch, envOverrides = {}) {
  try {
    execFileSync("node_modules/.bin/commitlint", [], {
      cwd: repoRoot,
      input: message,
      env: {
        ...process.env,
        CI: "",
        COMMITLINT_BRANCH: branch,
        ...envOverrides,
      },
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, output: error.stdout?.toString() ?? "" };
  }
}

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

test("a Generated-by trailer naming an AI assistant is rejected", () => {
  const message = "feat(x): subject\n\nbody.\n\nGenerated-by: Claude Code";
  assert.equal(evaluateAiAttribution(message).ok, false);
});

test("a Generated-by trailer naming another AI assistant is rejected", () => {
  const message = "feat(x): subject\n\nbody.\n\nGenerated-by: GitHub Copilot";
  assert.equal(evaluateAiAttribution(message).ok, false);
});

test("an ordinary trailer whose value doesn't name an assistant passes", () => {
  const message = "feat(x): subject\n\nbody.\n\nRefs: VLB-1";
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

test("a retired-tool scope is rejected by scope-enum, case-insensitively", () => {
  const message =
    "feat(x): subject\n\nbody.\n\nBlueprint-Change: commit-guardrails";
  for (const scope of ["spectra", "Spectra"]) {
    const verdict = runCommitlint(
      message.replace("feat(x)", `feat(${scope})`),
      "feat/commit-guardrails",
    );
    assert.equal(verdict.ok, false, `expected "${scope}" to be rejected`);
    assert.match(verdict.output, /scope-case|scope-enum/);
  }
});

test("a default revert message on a Change branch is rejected, not ignored", () => {
  const verdict = runCommitlint(
    'Revert "feat(x): subject"\n\nThis reverts commit abc123.\n',
    "feat/commit-guardrails",
  );
  assert.equal(verdict.ok, false);
  assert.match(verdict.output, /blueprint-change-trailer/);
});

test("a conventional revert with body and trailer is accepted", () => {
  const verdict = runCommitlint(
    "revert: subject\n\nbody explaining why this is reverted.\n\nBlueprint-Change: commit-guardrails\n",
    "feat/commit-guardrails",
  );
  assert.deepEqual(verdict, { ok: true });
});

test("a merge commit is still ignored", () => {
  const verdict = runCommitlint(
    "Merge pull request #1 from x/y\n",
    "feat/commit-guardrails",
  );
  assert.deepEqual(verdict, { ok: true });
});

test("fixup! is ignored locally but rejected in CI", () => {
  const message = "fixup! feat(x): subject\n";
  assert.deepEqual(runCommitlint(message, "feat/commit-guardrails"), {
    ok: true,
  });
  assert.equal(
    runCommitlint(message, "feat/commit-guardrails", { CI: "true" }).ok,
    false,
  );
});

test("a -v style message with 'generated by Claude' only in the diff passes", () => {
  const message = [
    "feat(x): subject",
    "",
    "body explaining why.",
    "",
    "Blueprint-Change: commit-guardrails",
    "# ------------------------ >8 ------------------------",
    "diff --git a/foo.js b/foo.js",
    "-// generated by Claude",
    "+// something else",
    "",
  ].join("\n");
  assert.deepEqual(runCommitlint(message, "feat/commit-guardrails"), {
    ok: true,
  });
});

test("a Blueprint-Change slug containing an assistant's name is not attribution", () => {
  const message =
    "feat(x): subject\n\nbody.\n\nBlueprint-Change: claude-md-bridge";
  assert.deepEqual(evaluateAiAttribution(message), { ok: true });
});

test("prose quoting a 'Generated with' line mid-sentence passes", () => {
  const message =
    'feat(x): subject\n\nThe hook rejects a line such as "Generated with Claude Code" in a message.';
  assert.deepEqual(evaluateAiAttribution(message), { ok: true });
});

test("an emoji-prefixed 'Generated with' line is rejected", () => {
  const message =
    "feat(x): subject\n\nbody.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)";
  assert.equal(evaluateAiAttribution(message).ok, false);
});

test("a body line starting with a Word: token is named, since the parser ends the body there", () => {
  const message =
    "docs(x): subject\n\nStandards: the helper goes and the\ncomment goes too.\n\nRefs: ATE-1";
  const verdict = evaluateFooterLookalike(message);
  assert.equal(verdict.ok, false);
  assert.match(verdict.message, /"Standards: the helper goes and the"/);
});

test("a Word: line after the body has started is left to commitlint", () => {
  const message =
    "docs(x): subject\n\nWhat changed.\n\nVerification: pnpm test:workflow.\n\nRefs: ATE-1";
  assert.deepEqual(evaluateFooterLookalike(message), { ok: true });
});

test("the trailer paragraph, URLs and prose colons pass", () => {
  const message =
    "docs(x): subject\n\nSee https://example.com and note this: a colon mid-line.\n\nBlueprint-Change: x\nImplements: S01";
  assert.deepEqual(evaluateFooterLookalike(message), { ok: true });
});

test("commitlint names the look-alike line instead of reporting an empty body", () => {
  const result = runCommitlint(
    "docs(x): subject\n\nStandards: the helper goes.\n\nMore body.\n",
    "dev",
  );
  assert.equal(result.ok, false);
  assert.match(result.output, /footer-lookalike/);
});
