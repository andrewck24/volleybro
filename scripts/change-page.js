import {
  CHANGE_BRANCH_PREFIXES,
  parseChangeBranch,
} from "./commitlint/plugin.js";
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
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

const FRONTMATTER = /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;

export function frontmatterOf(content) {
  return content.match(FRONTMATTER)?.[0] ?? "";
}

// The gate reads the page with the same MDX grammar the site compiles it
// with, so code, strings and prose can never pass for structure. The
// frontmatter is YAML, not MDX, so it is blanked first, offsets kept.
function parse(content) {
  const frontmatter = frontmatterOf(content);
  const body =
    frontmatter.replace(/[^\r\n]/g, " ") + content.slice(frontmatter.length);
  return fromMarkdown(body, {
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

function valueOf(value) {
  if (value?.type === "Literal" && typeof value.value === "number") {
    return value.value;
  }
  return stringOf(value);
}

// An entry's own string fields, keyed; a key it lacks reads as undefined.
// An element that is not an object literal (a spread, a variable) reads as an
// entry with no id, so the gate reports it instead of skipping it.
function entriesOf(arrayExpression) {
  return (arrayExpression?.elements ?? []).map((element) =>
    element?.type === "ObjectExpression"
      ? Object.fromEntries(
          element.properties
            .filter((property) => property.type === "Property")
            .map((property) => [keyOf(property), valueOf(property.value)]),
        )
      : {},
  );
}

function findScenariosExport(tree) {
  for (const node of walk(tree)) {
    if (node.type !== "mdxjsEsm") continue;
    for (const statement of node.data.estree.body) {
      const declarator = statement.declaration?.declarations?.find(
        (candidate) => candidate.id?.name === "scenarios",
      );
      if (declarator) return declarator;
    }
  }
  return undefined;
}

function attributeArray(element, name) {
  const attribute = element.attributes.find(
    (candidate) => candidate.name === name,
  );
  return attribute?.value?.data?.estree?.body[0]?.expression;
}

export function scenarios(content) {
  const declarator = findScenariosExport(parse(content));
  if (!declarator) return [];
  return declarator.init?.type === "ArrayExpression"
    ? entriesOf(declarator.init)
    : [{}];
}

export function scenarioIds(content) {
  return scenarios(content).map((entry) => entry.id);
}

export function resultIds(content) {
  return elements(parse(content), "ScenarioResults")
    .flatMap((element) => entriesOf(attributeArray(element, "results")))
    .filter((entry) => entry.result === "pass" || entry.result === "fail")
    .map((entry) => entry.id);
}

export function decisionIds(content) {
  return elements(parse(content), "DecisionCards").flatMap((element) =>
    (attributeArray(element, "ids")?.elements ?? []).map(stringOf),
  );
}

export function assertValidMdx(content) {
  parse(content);
}

function reviewNames(content, type) {
  const found = [...walk(parse(content))]
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

// ADR-0094: a Change directory holds index.mdx (frontmatter only),
// proposal.mdx, and review.mdx or one review-s<N>.mdx per Sharded Change.
const REVIEW_FILE = /^review(?:-s([1-9]\d*))?\.mdx$/;

export function reviewFile(shard) {
  return shard === undefined ? "review.mdx" : `review-s${shard}.mdx`;
}

export function isReviewFile(name) {
  return REVIEW_FILE.test(name);
}

export async function readChangeDir(dir) {
  const read = (name) =>
    readFile(path.join(dir, name), "utf8").catch(() => undefined);
  const reviews = [];
  for (const name of await readdir(dir).catch(() => [])) {
    const match = name.match(REVIEW_FILE);
    if (!match) continue;
    reviews.push({
      shard: match[1] ? Number(match[1]) : undefined,
      file: name,
      content: await read(name),
    });
  }
  reviews.sort((a, b) => (a.shard ?? 0) - (b.shard ?? 0));
  return {
    index: await read("index.mdx"),
    proposal: await read("proposal.mdx"),
    reviews,
  };
}

// A Sharded Change states its shard count in the frontmatter (ADR-0093).
export function shardCount(index) {
  const match = frontmatterOf(index ?? "").match(/^shards:\s*(\d+)\s*$/m);
  return match ? Number(match[1]) : undefined;
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

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The commit on dev's first-parent line that landed the Change, or one shard
// of it: a merge commit whose subject names its branch, or a squash commit
// carrying its trailers.
export async function landingOf(root, base, slug, shard) {
  const name = escapeRegExp(shard === undefined ? slug : `${slug}-s${shard}`);
  const branch = new RegExp(
    `(?:^|[\\s/'])(?:${CHANGE_BRANCH_PREFIXES.join("|")})/${name}(?:$|[\\s'])`,
  );
  // git parses the trailers, so a body line that merely starts with "Shard:"
  // is not taken for one.
  const log = await git(root, [
    "log",
    "--first-parent",
    "--format=%H%x1f%P%x1f%cI%x1f%s%x1f%(trailers:key=Blueprint-Change,valueonly,separator=%x1d)%x1f%(trailers:key=Shard,valueonly,separator=%x1d)%x1e",
    base,
  ]);
  for (const record of log.split("\x1e")) {
    const [
      hash,
      parents = "",
      archivedAt,
      subject = "",
      change = "",
      shards = "",
    ] = record.trim().split("\x1f");
    const [first, second] = parents.split(" ");
    if (second && branch.test(subject)) {
      return {
        from: first,
        to: hash,
        commitRange: `${first}..${second}`,
        archivedAt,
      };
    }
    const values = (text) => text.split("\x1d").filter(Boolean);
    const shardValues = values(shards);
    if (
      first &&
      !second &&
      values(change).includes(slug) &&
      (shard === undefined
        ? shardValues.length === 0
        : shardValues.includes(String(shard)))
    ) {
      return { from: first, to: hash, commitRange: null, archivedAt };
    }
  }
  return null;
}

// A merged Change is measured by what landed it, so republishing it from
// another branch cannot pick up that branch's diff.
async function measure(root, base, landing, head = "HEAD") {
  const range = landing ? [landing.from, landing.to] : [`${base}...${head}`];
  const stat = await orNull(async () =>
    parseShortstat(await git(root, ["diff", "--shortstat", ...range])),
  );
  const commitRange = landing ? landing.commitRange : `${base}..${head}`;
  // ADR-0078: a Change starts at its first commit.
  const startedAt = await orNull(async () => {
    const [first] = (
      await git(root, [
        "log",
        "--reverse",
        "--format=%aI",
        commitRange ?? `${landing.from}..${landing.to}`,
      ])
    ).split("\n");
    return first ? new Date(first).toISOString() : null;
  });
  return {
    startedAt: startedAt ?? undefined,
    archivedAt: landing ? new Date(landing.archivedAt).toISOString() : null,
    commits: commitRange
      ? await orNull(async () =>
          Number(await git(root, ["rev-list", "--count", commitRange])),
        )
      : null,
    filesChanged: stat?.filesChanged ?? null,
    insertions: stat?.insertions ?? null,
    deletions: stat?.deletions ?? null,
    srcFilesChanged: await orNull(async () => {
      const output = await git(root, [
        "diff",
        "--name-only",
        ...range,
        "--",
        "src",
      ]);
      return output ? output.split("\n").length : 0;
    }),
  };
}

const FIGURES = [
  "commits",
  "filesChanged",
  "insertions",
  "deletions",
  "srcFilesChanged",
];

function totals(items) {
  return Object.fromEntries(
    FIGURES.map((key) => {
      const values = items.map((item) => item[key]).filter((v) => v != null);
      return [key, values.length ? values.reduce((a, b) => a + b, 0) : null];
    }),
  );
}

// A shard neither landed nor checked out is measured from its pushed branch.
async function pushedShard(root, slug, shard) {
  const refs = await orNull(() =>
    git(root, [
      "for-each-ref",
      "--format=%(refname)",
      ...CHANGE_BRANCH_PREFIXES.map(
        (prefix) => `refs/remotes/*/${prefix}/${slug}-s${shard}`,
      ),
    ]),
  );
  return refs?.split("\n").find(Boolean);
}

// ADR-0074: every figure a page shows comes from here, never from the writer.
// ADR-0096: a Sharded Change is measured shard by shard, then totalled.
// `gate` is set by a proposal-only publish, which is a G1 whatever the shard.
export async function changeFacts(
  root,
  page,
  { slug, firstPublishedAt, now = new Date(), gate } = {},
) {
  const base = await resolveScopeBase(root);
  const parts = [
    page.proposal,
    ...page.reviews.map((review) => review.content),
  ];
  const common = {
    publishedAt: now.toISOString(),
    scenarios: scenarioIds(page.proposal ?? "").length,
    decisions: [
      ...new Set(parts.flatMap((content) => decisionIds(content ?? ""))),
    ],
  };
  const count = shardCount(page.index);

  if (count === undefined) {
    const landing = slug
      ? await orNull(() => landingOf(root, base, slug))
      : null;
    const figures = await measure(root, base, landing);
    return {
      gate: gate ?? (page.reviews.length > 0 ? "G2" : "G1"),
      ...common,
      ...figures,
      startedAt: figures.startedAt ?? firstPublishedAt ?? now.toISOString(),
    };
  }

  const branch = parseChangeBranch(
    await orNull(() => git(root, ["rev-parse", "--abbrev-ref", "HEAD"])),
  );
  const current = branch?.slug === slug ? branch.shard : undefined;
  const reviewed = new Set(page.reviews.map((review) => review.shard));
  const items = [];
  // Only the first shard carries G1; a later one is at no gate until its G2,
  // so its publishes never become the Proposal's baseline (ADR-0095).
  const gateOf = (shard) =>
    reviewed.has(shard) ? "G2" : shard === 1 ? "G1" : undefined;
  for (let shard = 1; shard <= count; shard += 1) {
    const landing = await orNull(() => landingOf(root, base, slug, shard));
    const head =
      landing || shard === current
        ? "HEAD"
        : await pushedShard(root, slug, shard);
    if (!head) continue;
    items.push({
      shard,
      gate: gateOf(shard),
      ...(await measure(root, base, landing, head)),
    });
  }
  const merged = items.filter((item) => item.archivedAt);
  const started = items
    .map((item) => item.startedAt)
    .filter(Boolean)
    .sort();
  return {
    gate:
      gate ??
      (current ? gateOf(current) : reviewed.size > 0 ? "G2" : undefined),
    ...common,
    startedAt: started[0] ?? firstPublishedAt ?? now.toISOString(),
    archivedAt:
      merged.length === count
        ? merged
            .map((item) => item.archivedAt)
            .sort()
            .at(-1)
        : null,
    ...totals(items),
    shards: { count, current, merged: merged.length, items },
  };
}
