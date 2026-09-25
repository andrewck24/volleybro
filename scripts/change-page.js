import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxFromMarkdown } from "mdast-util-mdx";
import { mdxjs } from "micromark-extension-mdxjs";

const execFileAsync = promisify(execFile);

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

// The gate reads the page with the same MDX grammar the site compiles it
// with, so code, strings and prose can never pass for structure.
function parse(content) {
  return fromMarkdown(content, {
    extensions: [mdxjs()],
    mdastExtensions: [mdxFromMarkdown()],
  });
}

function* walk(node) {
  yield node;
  for (const child of node.children ?? []) yield* walk(child);
}

function elements(tree, name) {
  return [...walk(tree)].filter(
    (node) =>
      (node.type === "mdxJsxFlowElement" ||
        node.type === "mdxJsxTextElement") &&
      node.name === name,
  );
}

function keyOf(property) {
  return property.key?.type === "Identifier"
    ? property.key.name
    : property.key?.value;
}

function stringOf(value) {
  if (value?.type === "Literal" && typeof value.value === "string") {
    return value.value;
  }
  if (value?.type === "TemplateLiteral" && value.expressions.length === 0) {
    return value.quasis[0].value.cooked;
  }
  return undefined;
}

// An entry's own string fields, keyed; a key it lacks reads as undefined.
function entriesOf(arrayExpression) {
  return (arrayExpression?.elements ?? [])
    .filter((element) => element?.type === "ObjectExpression")
    .map((object) =>
      Object.fromEntries(
        object.properties
          .filter((property) => property.type === "Property")
          .map((property) => [keyOf(property), stringOf(property.value)]),
      ),
    );
}

function scenarioEntries(tree) {
  for (const node of walk(tree)) {
    if (node.type !== "mdxjsEsm") continue;
    for (const statement of node.data.estree.body) {
      for (const declarator of statement.declaration?.declarations ?? []) {
        if (declarator.id?.name === "scenarios") {
          return entriesOf(declarator.init);
        }
      }
    }
  }
  return [];
}

function attributeArray(element, name) {
  const attribute = element.attributes.find(
    (candidate) => candidate.name === name,
  );
  return attribute?.value?.data?.estree?.body[0]?.expression;
}

export function scenarioIds(content) {
  return scenarioEntries(parse(content)).map((entry) => entry.id);
}

export function resultIds(content) {
  return elements(parse(content), "ScenarioResults")
    .flatMap((element) => entriesOf(attributeArray(element, "results")))
    .filter((entry) => entry.result !== "pending")
    .map((entry) => entry.id);
}

export function decisionIds(content) {
  return elements(parse(content), "DecisionCards").flatMap((element) =>
    (attributeArray(element, "ids")?.elements ?? []).map(stringOf),
  );
}

export function proposalPart(content) {
  const [proposal] = elements(parse(content), "Proposal");
  return proposal
    ? content.slice(
        proposal.position.start.offset,
        proposal.position.end.offset,
      )
    : "";
}

export function hasReview(content) {
  return elements(parse(content), "Review").length > 0;
}

function reviewNames(content, type) {
  const [review] = elements(parse(content), "Review");
  if (!review) return [];
  const found = [...walk(review)]
    .filter((node) => node.type === type && REVIEW_SECTIONS.includes(node.name))
    .map((node) => node.name);
  return found.filter((name, index) => found.indexOf(name) === index);
}

export function reviewSections(content) {
  return reviewNames(content, "mdxJsxFlowElement");
}

// A section written on one line is inline MDX: it renders inside a <p> and
// the Review cannot put it in order.
export function inlineReviewSections(content) {
  return reviewNames(content, "mdxJsxTextElement");
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
