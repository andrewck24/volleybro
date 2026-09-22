import { execFileSync } from "node:child_process";

// Trailers are parsed by git itself (ADR-0057), not a hand-rolled parser:
// `interpret-trailers --parse` already implements git's own last-paragraph
// rule and normalizes formatting (e.g. a missing space after the colon).
function parseTrailers(rawMessage) {
  const stdout = execFileSync("git", ["interpret-trailers", "--parse"], {
    input: rawMessage ?? "",
    encoding: "utf8",
  });
  const trailers = new Map();
  for (const line of stdout.split("\n")) {
    const separator = line.indexOf(": ");
    if (separator === -1) continue;
    const key = line.slice(0, separator).toLowerCase();
    const value = line.slice(separator + 2);
    const values = trailers.get(key) ?? [];
    values.push(value);
    trailers.set(key, values);
  }
  return trailers;
}

function currentBranch() {
  if (process.env.COMMITLINT_BRANCH) return process.env.COMMITLINT_BRANCH;
  try {
    return execFileSync("git", ["branch", "--show-current"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

const CHANGE_BRANCH = /^(feat|fix|refactor)\/(.+)$/;

function fixPathSuffix(prefix, slug) {
  return `Fix-path work belongs on hotfix/${slug} instead, not ${prefix}/${slug}.`;
}

/**
 * Pure verdict: does `message` carry the Blueprint-Change trailer that
 * `branchName` requires (ADR-0057)? Branch name and message in, verdict
 * out — no git access beyond the trailer parse above.
 */
export function evaluateChangeBranchTrailer(branchName, message) {
  if (!branchName) return { ok: true }; // detached HEAD (e.g. rebase reword): skip silently

  const match = branchName.match(CHANGE_BRANCH);
  if (!match) return { ok: true }; // dev, hotfix/*, chore/*, docs/*, claude/*, ...
  const [, prefix, slug] = match;

  const value = parseTrailers(message).get("blueprint-change")?.[0];
  if (value === undefined) {
    return {
      ok: false,
      message: `branch "${branchName}" is a Change branch (slug "${slug}") and needs a "Blueprint-Change: ${slug}" trailer, but the commit has none. ${fixPathSuffix(prefix, slug)}`,
    };
  }
  if (value !== slug) {
    return {
      ok: false,
      message: `branch "${branchName}" needs "Blueprint-Change: ${slug}", but the commit carries "Blueprint-Change: ${value}". ${fixPathSuffix(prefix, slug)}`,
    };
  }
  return { ok: true };
}

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

/** Pure verdict: does `message` carry AI attribution? */
export function evaluateAiAttribution(message) {
  const raw = message ?? "";

  const aiCoAuthor = (parseTrailers(raw).get("co-authored-by") ?? []).find(
    namesAiAssistant,
  );
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

/** Pure verdict: is `scope` on `deniedScopes` (case-insensitive)? */
export function evaluateScopeDenyList(scope, deniedScopes) {
  const lower = (scope ?? "").toLowerCase();
  if (!lower) return { ok: true };
  const denied = deniedScopes.find((name) => name.toLowerCase() === lower);
  return denied
    ? {
        ok: false,
        message: `scope "${denied}" is a retired tool name and may not be used as a commit scope`,
      }
    : { ok: true };
}

// The one local plugin commitlint allows per project (ADR-0055).
const plugin = {
  rules: {
    "blueprint-change-trailer": (parsed) => {
      const verdict = evaluateChangeBranchTrailer(currentBranch(), parsed.raw);
      return verdict.ok ? [true] : [false, verdict.message];
    },
    "no-ai-attribution": (parsed) => {
      const verdict = evaluateAiAttribution(parsed.raw);
      return verdict.ok ? [true] : [false, verdict.message];
    },
    "scope-deny-list": (parsed, _when, deniedScopes = []) => {
      const verdict = evaluateScopeDenyList(parsed.scope, deniedScopes);
      return verdict.ok ? [true] : [false, verdict.message];
    },
  },
};

export default plugin;
