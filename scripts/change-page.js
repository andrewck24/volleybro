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

// Tags and ids inside fenced code are examples, not structure: blank the
// fences out (keeping offsets) before looking, then slice the original.
function maskCode(content) {
  return content.replace(/^```[\s\S]*?^```/gm, (block) =>
    block.replace(/[^\n]/g, " "),
  );
}

function between(content, open, close) {
  const masked = maskCode(content);
  const start = masked.search(open);
  if (start === -1) return "";
  const bodyStart = masked.indexOf(">", start) + 1;
  const end = masked.indexOf(close, bodyStart);
  return end === -1 ? "" : content.slice(bodyStart, end);
}

// An entry is recognised by how it opens — `{ id: "S1", given:` for a
// scenario, `{ id: "S1", result:` for a result — so the same words inside a
// string value never count.
const KEY = (name) => `["']?${name}["']?\\s*:\\s*`;
const ENTRY = (second) =>
  new RegExp(
    `\\{\\s*${KEY("id")}["']([^"']+)["']\\s*,\\s*${KEY(second)}["']([^"']*)["']`,
    "g",
  );

export function scenarioIds(content) {
  return [...maskCode(content).matchAll(ENTRY("given"))].map((m) => m[1]);
}

export function resultIds(content) {
  return [...maskCode(content).matchAll(ENTRY("result"))]
    .filter((m) => m[2] !== "pending")
    .map((m) => m[1]);
}

export function decisionIds(content) {
  return [
    ...maskCode(content).matchAll(/<DecisionCards\s+ids=\{\[([^\]]*)\]\}/g),
  ]
    .flatMap((match) => [...match[1].matchAll(/["']([^"']+)["']/g)])
    .map((match) => match[1]);
}

export function proposalPart(content) {
  return between(content, /<Proposal[\s>]/, "</Proposal>");
}

export function hasReview(content) {
  return /<Review[\s>]/.test(maskCode(content));
}

export function reviewSections(content) {
  const review = maskCode(between(content, /<Review[\s>]/, "</Review>"));
  const found = [...review.matchAll(/<([A-Z][A-Za-z]*)\b/g)]
    .map((match) => match[1])
    .filter((name) => REVIEW_SECTIONS.includes(name));
  return found.filter((name, index) => found.indexOf(name) === index);
}

// ADR-0072: index.mdx without change.json; change.json marks the old format.
export function isSinglePageDir(files) {
  return files.includes("index.mdx") && !files.includes("change.json");
}

export function parseShortstat(line) {
  const count = (pattern) => Number(line.match(pattern)?.[1] ?? 0);
  return {
    filesChanged: count(/(\d+) files? changed/),
    insertions: count(/(\d+) insertions?\(\+\)/),
    deletions: count(/(\d+) deletions?\(-\)/),
  };
}

export async function git(root, args) {
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
