import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Reads a single-page Change (`index.mdx` with Proposal and Review tabs,
// ADR-0072) well enough for the publish script and the gate check. The page
// is authored to a fixed shape, so regular expressions over that shape are
// enough; a full MDX parse would buy nothing the gate uses.

const REVIEW_SECTIONS = [
  "ActionItems",
  "ReviewFocus",
  "Deviations",
  "ScenarioResults",
  "TestPlan",
  "AfterRelease",
  "ReviewDetails",
];

export const REQUIRED_REVIEW_SECTIONS = REVIEW_SECTIONS.filter(
  (section) => section !== "AfterRelease",
);

function between(content, open, close) {
  const start = content.indexOf(open);
  if (start === -1) return "";
  const end = content.indexOf(close, start + open.length);
  return end === -1 ? "" : content.slice(start + open.length, end);
}

function ids(fragment) {
  return [...fragment.matchAll(/\bid:\s*["']([^"']+)["']/g)].map(
    (match) => match[1],
  );
}

export function scenarioIds(content) {
  const match = content.match(/export const scenarios\s*=\s*\[([\s\S]*?)\];/);
  return match ? ids(match[1]) : [];
}

export function resultIds(content) {
  const block = content.match(/<ScenarioResults\b[\s\S]*?\/>/);
  if (!block) return [];
  const results = block[0].match(/results=\{\[([\s\S]*?)\]\}/);
  return results ? ids(results[1]) : [];
}

export function decisionIds(content) {
  return [...content.matchAll(/<DecisionCards\s+ids=\{\[([^\]]*)\]\}/g)]
    .flatMap((match) => [...match[1].matchAll(/["']([^"']+)["']/g)])
    .map((match) => match[1]);
}

export function proposalPart(content) {
  return between(content, "<Proposal>", "</Proposal>");
}

export function hasReview(content) {
  return content.includes("<Review>");
}

export function reviewSections(content) {
  const review = between(content, "<Review>", "</Review>");
  const found = [...review.matchAll(/<([A-Z][A-Za-z]*)\b/g)]
    .map((match) => match[1])
    .filter((name) => REVIEW_SECTIONS.includes(name));
  return found.filter((name, index) => found.indexOf(name) === index);
}

export function parseShortstat(line) {
  const count = (pattern) => Number(line.match(pattern)?.[1] ?? 0);
  return {
    filesChanged: count(/(\d+) files? changed/),
    insertions: count(/(\d+) insertions?\(\+\)/),
    deletions: count(/(\d+) deletions?\(-\)/),
  };
}

async function git(root, args) {
  return (await execFileAsync("git", args, { cwd: root })).stdout.trim();
}

export async function resolveScopeBase(root) {
  try {
    await git(root, ["rev-parse", "--verify", "origin/dev"]);
    return "origin/dev";
  } catch {
    return "dev";
  }
}

async function orNull(read) {
  try {
    return await read();
  } catch {
    return null;
  }
}

// ADR-0074: every figure a page shows comes from here, never from the writer.
export async function changeFacts(root, content, now = new Date()) {
  const base = await resolveScopeBase(root);
  const stat = await orNull(async () =>
    parseShortstat(await git(root, ["diff", "--shortstat", `${base}...HEAD`])),
  );
  return {
    gate: hasReview(content) ? "G2" : "G1",
    publishedAt: now.toISOString(),
    commits: await orNull(async () =>
      Number(await git(root, ["rev-list", "--count", `${base}..HEAD`])),
    ),
    filesChanged: stat?.filesChanged ?? null,
    insertions: stat?.insertions ?? null,
    deletions: stat?.deletions ?? null,
    srcFilesChanged: await orNull(async () => {
      const output = await git(root, [
        "diff",
        "--name-only",
        `${base}...HEAD`,
        "--",
        "src",
      ]);
      return output ? output.split("\n").length : 0;
    }),
    scenarios: scenarioIds(content).length,
    decisions: decisionIds(content),
  };
}
