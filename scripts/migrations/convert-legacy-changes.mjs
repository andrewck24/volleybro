// One-off migration for the legacy-change-conversion Change (ADR-0079):
// rewrites every old-format Change under blueprint/content/changes/ into the
// single-page format, in place. Delete this script once the store is converted.
//
//   node scripts/migrations/convert-legacy-changes.mjs          # convert + verify
//   node scripts/migrations/convert-legacy-changes.mjs --check  # verify only, write nothing
//
// Every source paragraph must land in the converted page or in the declared
// drop list; any other paragraph fails the run and is named.

import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const CHANGES = path.join(ROOT, "blueprint/content/changes");
const DECISIONS = path.join(ROOT, "blueprint/content/decisions");
const CHECK_ONLY = process.argv.includes("--check");

// Components whose whole block is dropped: they render process records the
// single-page format has no place for, or history ADR-0079 does not keep.
const DROPPED_COMPONENTS = [
  "FileTour",
  "TaskProgress",
  "Scenario",
  "WorkflowBlastRadius",
  "WorkflowLifecycleFlowchart",
];
// Whole files dropped: the implementation plan and slices, OpenSpec tasks, and
// OpenSpec specs, whose still-current requirements are promoted to Features.
const DROPPED_FILE =
  /^(implementation(\.mdx|\/)|tasks\.mdx$|specs\/|change\.json$|meta\.json$|design\/decisions\/)/;

const PULL_REQUESTS = {
  "apple-splash-dynamic": 306,
  "contextual-edit-pages": 304,
  "dialog-close-ownership": 409,
  "elevation-depth-system": 318,
  "error-display-boundary": 406,
  "game-positional-writes": 375,
  "honest-sync-status": 397,
  "lifecycle-owned-status": 377,
  "logo-v-splash-redesign": 339,
  "outbox-read-projection": 402,
  "rally-entry-validation": 403,
  "reconnect-without-reload": 398,
  "request-schema-boundary": 404,
  "retryable-entry-writes": 378,
  "retryable-queue-persistence": 390,
  "team-membership-authorization": 410,
  "unified-software-delivery-workflow": 364,
};

const NOTE = "由舊格式機械轉換，未經 G1／G2；持久知識見 Features 與決策記錄。";
const DRAFT_NOTE =
  "這是未通過 G1 的草稿，其中的決策未經核對，也不在決策記錄裡。";

function listFiles(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory()
      ? listFiles(full, base)
      : [path.relative(base, full)];
  });
}

const FENCE = /^\s*```/;
const decisionFiles = readdirSync(DECISIONS);
const globalDecisions = decisionFiles.map((file) =>
  JSON.parse(readFileSync(path.join(DECISIONS, file), "utf8")),
);

// D<n> inside an old Change became the n-th global record whose originChange
// is that Change; the records were numbered in D order when they moved.
function globalIdFor(slug, localFile) {
  const n = Number(localFile.match(/D(\d+)-/)[1]);
  const records = globalDecisions
    .filter((record) => record.originChange === slug)
    .sort((a, b) => a.id.localeCompare(b.id));
  const record = records[n - 1];
  if (!record) throw new Error(`${slug}: no global record for ${localFile}`);
  return record.id;
}

function splitFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { title: undefined, body: text };
  const title = match[1].match(/^title:\s*(.*)$/m)?.[1]?.trim();
  return { title, body: text.slice(match[0].length) };
}

// Finds the end line of a JSX element starting at `start`. Props hold code
// with unbalanced braces, so this relies on layout instead: a one-line element
// ends in `/>`, a multi-line one closes with `/>` or `</Name>` on its own line
// at the opening tag's indentation.
function blockEnd(lines, start, name) {
  if (/\/>\s*$/.test(lines[start])) return start;
  const indent = lines[start].match(/^\s*/)[0];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i].trimEnd();
    if (line === `${indent}/>` || line === `${indent}</${name}>`) return i;
  }
  throw new Error(`unterminated <${name}> at line ${start + 1}`);
}

// Record text is plain prose that may name JSX-like types (`<Substitutes>`) or
// hold braces; MDX would parse both outside a code span, so they are escaped
// there and code spans are left as written.
function escapeMdx(text) {
  return text
    .split(/(`[^`]*`)/)
    .map((part, index) =>
      index % 2 === 1
        ? part
        : part.replace(/[<>{}]/g, (char) => `&#${char.charCodeAt(0)};`),
    )
    .join("");
}

function renderDraftDecision(record) {
  const lines = [`**${record.id}. ${record.title}**`, "", record.decision];
  if (record.context) lines.push("", `背景：${record.context}`);
  for (const alt of record.alternatives ?? []) {
    lines.push("", `- 未採用：${alt.option}（${alt.reason}）`);
  }
  return escapeMdx(lines.join("\n"));
}

// Returns { body, dropped } for one MDX file: imports and dropped components
// removed, DecisionTimeline replaced by DecisionCards (or static text for a
// draft whose records never entered the decisions directory).
function transformMdx(slug, text, { isDraft, dir }) {
  const lines = text.split("\n");
  const imports = new Map();
  const out = [];
  const dropped = [];
  let isInFence = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const isFenceLine = FENCE.test(line);
    if (isFenceLine) isInFence = !isInFence;
    if (isInFence || isFenceLine) {
      out.push(line);
      continue;
    }
    const importMatch = line.match(
      /^import\s+(\w+)\s+from\s+"(\.\/design\/decisions\/[^"]+)";?$/,
    );
    if (importMatch) {
      imports.set(importMatch[1], importMatch[2].replace("./", ""));
      dropped.push(line);
      continue;
    }
    if (/^import\s/.test(line)) {
      dropped.push(line);
      continue;
    }
    const tag = line.match(/^\s*<(\w+)/)?.[1];
    if (tag && DROPPED_COMPONENTS.includes(tag)) {
      const end = blockEnd(lines, i, tag);
      dropped.push(...lines.slice(i, end + 1));
      i = end;
      continue;
    }
    if (tag === "DecisionTimeline") {
      const end = blockEnd(lines, i, tag);
      const block = lines.slice(i, end + 1).join("\n");
      dropped.push(block);
      const names = [...block.matchAll(/\b(\w+)\b/g)]
        .map((m) => m[1])
        .filter((name) => imports.has(name));
      if (isDraft) {
        out.push(
          names
            .map((name) =>
              renderDraftDecision(
                JSON.parse(
                  readFileSync(path.join(dir, imports.get(name)), "utf8"),
                ),
              ),
            )
            .join("\n\n"),
        );
      } else {
        const ids = names.map((name) => globalIdFor(slug, imports.get(name)));
        out.push(
          `<DecisionCards ids={[${ids.map((id) => `"${id}"`).join(", ")}]} />`,
        );
      }
      i = end;
      continue;
    }
    out.push(line);
  }
  return { body: out.join("\n").trim(), dropped: dropped.join("\n") };
}

function normalize(text) {
  return text.replace(/\s+/g, " ").trim();
}

function paragraphs(text) {
  let isInFence = false;
  const blocks = [];
  let current = [];
  for (const line of text.split("\n")) {
    if (FENCE.test(line)) isInFence = !isInFence;
    if (!isInFence && line.trim() === "") {
      if (current.length) blocks.push(current.join("\n"));
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current.join("\n"));
  return blocks.map(normalize).filter(Boolean);
}

// A mockup that imported its Change's own records now imports the global ones,
// and its FileTour glossary, a component the single-page format no longer
// ships, becomes a plain definition list so the definitions survive.
function patchDesign(slug, source) {
  const ids = [];
  const patched = source
    .replace(/"\.\/design\/decisions\/(D\d+-[^"]+\.json)"/g, (_, file) => {
      const id = globalIdFor(slug, file);
      ids.push(id);
      const target = decisionFiles.find((name) => name.startsWith(`${id}-`));
      return `"../../decisions/${target}"`;
    })
    .replace(/^import \{ FileTour \} from "@\/components\/FileTour";\n/m, "")
    .replace(
      /^(\s*)<FileTour files=\{(\w+)\} \/>\n/m,
      (_, indent, list) =>
        `${indent}<dl>\n${indent}  {${list}.map((item) => (\n${indent}    <div key={item.path}>\n${indent}      <dt className="font-semibold">{item.path}</dt>\n${indent}      <dd>{item.summary}</dd>\n${indent}      {item.code && <pre><code>{item.code}</code></pre>}\n${indent}    </div>\n${indent}  ))}\n${indent}</dl>\n`,
    );
  if (/FileTour|design\/decisions/.test(patched)) {
    throw new Error(
      `${slug}/design.tsx still references a dropped file or component`,
    );
  }
  return { source: patched, ids };
}

// The frozen shape of the page: index, then Proposal and Design sources in the
// Proposal tab; the old Review page, collapsed, in the Review tab.
const PROPOSAL_ORDER = ["index.mdx", "proposal.mdx", "design.mdx"];

function convert(slug) {
  const dir = path.join(CHANGES, slug);
  const meta = JSON.parse(readFileSync(path.join(dir, "change.json"), "utf8"));
  const isDraft = meta.lifecycle !== "archived";
  const files = listFiles(dir);
  const hasDesign = files.includes("design.tsx");

  const unknown = files.filter(
    (file) =>
      !DROPPED_FILE.test(file) &&
      ![...PROPOSAL_ORDER, "review.mdx", "design.tsx"].includes(file),
  );
  if (unknown.length)
    throw new Error(`${slug}: unmapped files ${unknown.join(", ")}`);

  const kept = [];
  const dropped = [];
  const sources = [];
  const section = (file, heading) => {
    if (!files.includes(file)) return "";
    const { title, body: raw } = splitFrontmatter(
      readFileSync(path.join(dir, file), "utf8"),
    );
    const { body, dropped: gone } = transformMdx(slug, raw, { isDraft, dir });
    sources.push(raw);
    dropped.push(gone);
    kept.push(body);
    if (!body) return "";
    return heading ? `## ${title ?? heading}\n\n${body}` : body;
  };

  const proposal = [
    isDraft ? `${NOTE}${DRAFT_NOTE}` : NOTE,
    section("index.mdx"),
    section("proposal.mdx", "Proposal"),
    section("design.mdx", "Design"),
    hasDesign ? "<DesignMockup />" : "",
  ].filter(Boolean);

  const review = isDraft ? "" : section("review.mdx", "Review");
  const pr = PULL_REQUESTS[slug];
  const reviewTab = review
    ? [
        "<Review>",
        "",
        "<ReviewDetails>",
        "",
        review,
        pr
          ? `\n合併於 [andrewck24/volleybro#${pr}](https://github.com/andrewck24/volleybro/pull/${pr})。`
          : "",
        "",
        "</ReviewDetails>",
        "",
        "</Review>",
      ].join("\n")
    : "";

  const capabilities = JSON.stringify(meta.capabilities ?? []);
  const page = [
    "---",
    `title: ${JSON.stringify(meta.title)}`,
    `description: ${JSON.stringify(meta.summary ?? "")}`,
    `capabilities: ${capabilities}`,
    "---",
    "",
    "<ChangeTabs>",
    "<Proposal>",
    "",
    proposal.join("\n\n"),
    "",
    "</Proposal>",
    reviewTab,
    "</ChangeTabs>",
    "",
  ].join("\n");

  const keptText = normalize(page);
  const droppedText = normalize(dropped.join("\n"));
  const missing = sources
    .flatMap(paragraphs)
    .filter((p) => !keptText.includes(p) && !droppedText.includes(p));
  if (missing.length) {
    throw new Error(
      `${slug}: ${missing.length} paragraph(s) neither kept nor dropped, first: ${missing[0].slice(0, 120)}`,
    );
  }

  const design = hasDesign
    ? patchDesign(slug, readFileSync(path.join(dir, "design.tsx"), "utf8"))
    : null;

  const decisionIds = [
    ...(design?.ids ?? []),
    ...[...page.matchAll(/<DecisionCards ids=\{\[([^\]]*)\]/g)].flatMap((m) =>
      [...m[1].matchAll(/"(\d{4})"/g)].map((x) => x[1]),
    ),
  ];
  const facts = {
    converted: true,
    ...(isDraft ? {} : { gate: "G2" }),
    startedAt: new Date(meta.startedAt).toISOString(),
    archivedAt: meta.archivedAt
      ? new Date(meta.archivedAt).toISOString()
      : null,
    decisions: decisionIds,
  };

  if (!CHECK_ONLY) {
    for (const file of files) {
      if (file !== "design.tsx") rmSync(path.join(dir, file), { force: true });
    }
    for (const sub of ["design", "implementation", "specs"]) {
      rmSync(path.join(dir, sub), { recursive: true, force: true });
    }
    writeFileSync(path.join(dir, "index.mdx"), page);
    if (design) writeFileSync(path.join(dir, "design.tsx"), design.source);
    writeFileSync(
      path.join(dir, "facts.json"),
      `${JSON.stringify(facts, null, 2)}\n`,
    );
  }
  return {
    slug,
    isDraft,
    decisions: decisionIds.length,
    review: Boolean(review),
    pr: Boolean(pr),
  };
}

const slugs = readdirSync(CHANGES).filter((slug) =>
  existsSync(path.join(CHANGES, slug, "change.json")),
);
const results = slugs.map(convert);
console.table(results);
console.log(
  `${CHECK_ONLY ? "checked" : "converted"} ${results.length} Change(s)`,
);
