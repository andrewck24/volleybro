import { parseTrailers } from "./trailers.js";

// Kept short on purpose: the assistants this repo has actually seen show up
// as attribution (see CONTRIBUTING.md, and the `gemini`/`claude-review`
// scopes retired by commit-guardrails' scope deny list). Add a name here
// only once it has actually shown up in a commit.
const AI_NAMES = [
  "claude",
  "anthropic",
  "chatgpt",
  "copilot",
  "codex",
  "gemini",
];

function namesAiAssistant(text) {
  const lower = text.toLowerCase();
  return AI_NAMES.some((name) => lower.includes(name));
}

/**
 * Pure verdict: does `message` carry AI attribution? No git access.
 * @param {string} message raw commit message
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function evaluateAiAttribution(message) {
  const raw = message ?? "";

  const coAuthor = parseTrailers(raw).get("Co-Authored-By") ?? [];
  const aiCoAuthor = coAuthor.find(namesAiAssistant);
  if (aiCoAuthor) {
    return {
      ok: false,
      message: `commit carries a Co-Authored-By trailer naming an AI assistant ("${aiCoAuthor}"); AI attribution is not allowed in commit messages.`,
    };
  }

  const generatedLine = raw
    .split("\n")
    .find(
      (line) => /generated (with|by)/i.test(line) && namesAiAssistant(line),
    );
  if (generatedLine) {
    return {
      ok: false,
      message: `commit message names an AI assistant in a "Generated with/by" line ("${generatedLine.trim()}"); AI attribution is not allowed in commit messages.`,
    };
  }

  return { ok: true };
}
