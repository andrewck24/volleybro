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

const blank = (text) => text.replace(/[^\n]/g, " ");

// The page's structure with code and string contents blanked out, offsets
// kept: tags, brackets and keys are found here, values read from the
// original at the same offsets. Code shows examples of the syntax, and a
// string value can say anything, so neither may count as structure.
function structureOf(content) {
  const keepQuotes = (quoted) =>
    quoted[0] + blank(quoted.slice(1, -1)) + quoted[0];
  return content
    .replace(/^[ \t]*(`{3,}|~{3,})[\s\S]*?^[ \t]*\1[^\n]*$/gm, blank)
    .replace(/`[^`]*`/g, keepQuotes)
    .replace(
      /"(?:\\.|[^"\\\n])*"|(?<!\w)'(?:\\.|[^'\\\n])*'/g,
      (quoted, offset, text) =>
        /^\s*:/.test(text.slice(offset + quoted.length))
          ? quoted
          : keepQuotes(quoted),
    );
}

function between(content, open, close) {
  const structure = structureOf(content);
  const start = structure.search(open);
  if (start === -1) return "";
  const bodyStart = structure.indexOf(">", start) + 1;
  const end = structure.indexOf(close, bodyStart);
  return end === -1 ? "" : content.slice(bodyStart, end);
}

// The objects of the array literal that follows `opener`, as [start, end]
// offsets; nesting is tracked on the structure, where strings are blank.
function arrayObjects(structure, opener) {
  const match = opener.exec(structure);
  if (!match) return [];
  const objects = [];
  let depth = 0;
  let objectStart = -1;
  for (let i = match.index + match[0].length; i < structure.length; i++) {
    const char = structure[i];
    if (char === "[" || char === "{") {
      if (char === "{" && depth === 0) objectStart = i;
      depth++;
    } else if (char === "]" || char === "}") {
      if (depth === 0) break;
      depth--;
      if (char === "}" && depth === 0) objects.push([objectStart, i + 1]);
    }
  }
  return objects;
}

function depthWithin(structure, start, index) {
  let depth = 0;
  for (let i = start; i < index; i++) {
    if (structure[i] === "{" || structure[i] === "[") depth++;
    else if (structure[i] === "}" || structure[i] === "]") depth--;
  }
  return depth;
}

// Only the object's own key counts, not the same key in an object nested in it.
function stringValueAt(content, structure, [start, end], key) {
  const pattern = new RegExp(
    `(?:^|[{,\\s])["']?${key}["']?\\s*:\\s*(["'\`])`,
    "g",
  );
  pattern.lastIndex = start;
  for (let match; (match = pattern.exec(structure)) && match.index < end;) {
    if (depthWithin(structure, start, match.index + 1) !== 1) continue;
    const valueStart = match.index + match[0].length;
    return content.slice(valueStart, structure.indexOf(match[1], valueStart));
  }
  return undefined;
}

function idAndResultEntries(content, opener) {
  const structure = structureOf(content);
  return arrayObjects(structure, opener).map((range) => ({
    id: stringValueAt(content, structure, range, "id"),
    result: stringValueAt(content, structure, range, "result"),
  }));
}

const SCENARIOS = /export\s+const\s+scenarios\s*=\s*\[/;
const RESULTS = /<ScenarioResults\b[\s\S]*?results\s*=\s*\{\s*\[/;

export function scenarioIds(content) {
  return idAndResultEntries(content, SCENARIOS).map((entry) => entry.id);
}

export function resultIds(content) {
  return idAndResultEntries(content, RESULTS)
    .filter((entry) => entry.result !== "pending")
    .map((entry) => entry.id);
}

export function decisionIds(content) {
  const structure = structureOf(content);
  return [
    ...structure.matchAll(/<DecisionCards\s+ids=\{\[([^\]]*)\]\}/g),
  ].flatMap((match) => {
    const listStart = match.index + match[0].indexOf("[") + 1;
    const list = content.slice(listStart, listStart + match[1].length);
    return [...list.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
  });
}

export function proposalPart(content) {
  return between(content, /<Proposal[\s>]/, "</Proposal>");
}

export function hasReview(content) {
  return /<Review[\s>]/.test(structureOf(content));
}

export function reviewSections(content) {
  const review = structureOf(between(content, /<Review[\s>]/, "</Review>"));
  const found = [...review.matchAll(/<([A-Z][A-Za-z]*)\b/g)]
    .map((match) => match[1])
    .filter((name) => REVIEW_SECTIONS.includes(name));
  return found.filter((name, index) => found.indexOf(name) === index);
}

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
