import { execFileSync } from "node:child_process";

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

export const CHANGE_BRANCH_PREFIXES = ["feat", "fix", "refactor"];
const CHANGE_BRANCH = new RegExp(
  `^(${CHANGE_BRANCH_PREFIXES.join("|")})/(.+)$`,
);
const LINEAR_ISSUE = /^[A-Z][A-Z0-9]*-[1-9]\d*$/;
const SHARD_SUFFIX = /^(.+)-s([1-9]\d*)$/;

export function parseChangeBranch(branchName) {
  const match = branchName?.match(CHANGE_BRANCH);
  if (!match) return undefined;
  const [, prefix, name] = match;
  const shard = name.match(SHARD_SUFFIX);
  return shard
    ? { prefix, slug: shard[1], shard: Number(shard[2]) }
    : { prefix, slug: name, shard: undefined };
}

export function changeSlugOf(branchName) {
  return parseChangeBranch(branchName)?.slug;
}

function fastPathSuffix(prefix, slug) {
  return `Fast-path work belongs on fast/${slug} instead, not ${prefix}/${slug}.`;
}

export function evaluateChangeBranchTrailer(branchName, message) {
  if (!branchName) return { ok: true };

  const branch = parseChangeBranch(branchName);
  if (!branch) return { ok: true };
  const { prefix, slug, shard } = branch;

  const trailers = parseTrailers(message);
  const issue = trailers.get("linear-issue")?.[0];
  if (issue === undefined || !LINEAR_ISSUE.test(issue)) {
    return {
      ok: false,
      message: `branch "${branchName}" is a Change branch (slug "${slug}") and needs a "Linear-Issue: <ID>" trailer, but the commit carries ${issue === undefined ? "none" : `"Linear-Issue: ${issue}"`}. ${fastPathSuffix(prefix, slug)}`,
    };
  }
  const value = trailers.get("blueprint-change")?.[0];
  if (value !== undefined && value !== slug) {
    return {
      ok: false,
      message: `branch "${branchName}" needs "Blueprint-Change: ${slug}" or none, but the commit carries "Blueprint-Change: ${value}". ${fastPathSuffix(prefix, slug)}`,
    };
  }
  const shardValue = trailers.get("shard")?.[0];
  if (shard === undefined) {
    return shardValue === undefined
      ? { ok: true }
      : {
          ok: false,
          message: `branch "${branchName}" is not a shard branch, so the commit must not carry "Shard: ${shardValue}"; a shard branch ends in -s<N>.`,
        };
  }

  if (shardValue !== String(shard)) {
    return {
      ok: false,
      message: `branch "${branchName}" is shard ${shard} of Change "${slug}" and needs a "Shard: ${shard}" trailer, but the commit carries ${shardValue === undefined ? "none" : `"Shard: ${shardValue}"`}.`,
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

const SCISSORS = /^# -+ >8 -+$/m;

function stripDiffAndComments(rawMessage) {
  const scissors = SCISSORS.exec(rawMessage);
  const aboveScissors = scissors
    ? rawMessage.slice(0, scissors.index)
    : rawMessage;
  return execFileSync("git", ["stripspace", "--strip-comments"], {
    input: aboveScissors,
    encoding: "utf8",
  });
}

const ATTRIBUTION_TRAILERS = new Set(["co-authored-by", "generated-by"]);
const GENERATED_LINE = /^\W*generated[\s-](with|by)\b/i;

export function evaluateAiAttribution(message) {
  const raw = message ?? "";

  for (const [key, values] of parseTrailers(raw)) {
    if (!ATTRIBUTION_TRAILERS.has(key)) continue;
    const named = values.find(namesAiAssistant);
    if (named) {
      return {
        ok: false,
        message: `commit carries a "${key}" trailer naming an AI assistant ("${named}"); AI attribution is not allowed in commit messages.`,
      };
    }
  }

  const generatedLine = stripDiffAndComments(raw)
    .split("\n")
    .find((line) => GENERATED_LINE.test(line) && namesAiAssistant(line));
  if (generatedLine) {
    return {
      ok: false,
      message: `commit message names an AI assistant in a "Generated with/by" line ("${generatedLine.trim()}"); AI attribution is not allowed in commit messages.`,
    };
  }

  return { ok: true };
}

const FOOTER_TOKEN = /^[A-Za-z][\w-]*: \S/;

export function evaluateFooterLookalike(message) {
  const [, ...paragraphs] = stripDiffAndComments(message ?? "")
    .trim()
    .split(/\n\s*\n/);
  const firstLine = paragraphs.length > 1 ? paragraphs[0].split("\n")[0] : "";
  return FOOTER_TOKEN.test(firstLine)
    ? {
        ok: false,
        message: `the body opens with "${firstLine}", which reads as a footer token, so commitlint sees no body; reword it so it does not start with "${firstLine.split(":")[0]}:".`,
      }
    : { ok: true };
}

function toRuleOutcome(verdict) {
  return verdict.ok ? [true] : [false, verdict.message];
}

const plugin = {
  rules: {
    "change-branch-trailer": (parsed) =>
      toRuleOutcome(evaluateChangeBranchTrailer(currentBranch(), parsed.raw)),
    "no-ai-attribution": (parsed) =>
      toRuleOutcome(evaluateAiAttribution(parsed.raw)),
    "footer-lookalike": (parsed) =>
      toRuleOutcome(evaluateFooterLookalike(parsed.raw)),
  },
};

export default plugin;
