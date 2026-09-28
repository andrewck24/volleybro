#!/usr/bin/env node
/*
 * One-time conversion (ADR-0094, ADR-0079): split every Change page on the
 * blueprint-changes store branch into index.mdx, proposal.mdx and review.mdx,
 * and fold spectra-knowledge-promotion into legacy-change-conversion as its
 * second shard (ADR-0093). Text moves verbatim; facts.json is left as it is.
 *
 * Usage: node scripts/migrations/split-change-pages.js [--dry-run | --local]
 *
 * --local converts the pulled pages in blueprint/content/changes instead, to
 * build and read them before the store is converted after merge.
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxFromMarkdown } from "mdast-util-mdx";
import { mdxjs } from "micromark-extension-mdxjs";

import {
  fetchChanges,
  REMOTE_REF,
  resolveRemote,
} from "../blueprint-changes.js";
import { frontmatterOf } from "../change-page.js";

const execFileAsync = promisify(execFile);
const git = async (cwd, args) =>
  (await execFileAsync("git", args, { cwd })).stdout.trim();

const MIGRATION = "legacy-change-conversion";
const SHARD = "spectra-knowledge-promotion";

function parse(content) {
  const frontmatter = frontmatterOf(content);
  return fromMarkdown(
    frontmatter.replace(/[^\r\n]/g, " ") + content.slice(frontmatter.length),
    { extensions: [mdxjs()], mdastExtensions: [mdxFromMarkdown()] },
  );
}

const sourceOf = (content, node) =>
  content.slice(node.position.start.offset, node.position.end.offset);

function innerOf(content, element) {
  if (!element || element.children.length === 0) return undefined;
  const first = element.children[0];
  const last = element.children.at(-1);
  return content.slice(first.position.start.offset, last.position.end.offset);
}

function exportedNames(esm) {
  return esm.flatMap((node) =>
    node.data.estree.body.flatMap(
      (statement) =>
        statement.declaration?.declarations?.map((d) => d.id.name) ?? [],
    ),
  );
}

// Every top-level node is frontmatter, an ESM block or the ChangeTabs; any
// other would be lost, so the conversion stops on it.
export function splitPage(slug, content) {
  const tree = parse(content);
  const frontmatter = frontmatterOf(content);
  const esm = [];
  let tabs;
  for (const node of tree.children) {
    if (node.position.end.offset <= frontmatter.length) continue;
    if (node.type === "mdxjsEsm") esm.push(node);
    else if (node.type === "mdxJsxFlowElement" && node.name === "ChangeTabs") {
      tabs = node;
    } else if (!(
      node.type === "paragraph" && !sourceOf(content, node).trim()
    )) {
      throw new Error(
        `${slug}: content outside the tabs at offset ${node.position.start.offset}`,
      );
    }
  }
  if (!tabs) throw new Error(`${slug}: no ChangeTabs`);
  const tab = (name) =>
    tabs.children.find(
      (child) => child.type === "mdxJsxFlowElement" && child.name === name,
    );
  const esmSource = esm.map((node) => sourceOf(content, node)).join("\n\n");
  const proposal = innerOf(content, tab("Proposal")) ?? "";
  const review = innerOf(content, tab("Review"));
  const names = exportedNames(esm).filter(
    (name) => review && new RegExp(`\\b${name}\\b`).test(review),
  );
  return {
    esm: esmSource,
    frontmatter,
    "index.mdx": frontmatter,
    "proposal.mdx": [esmSource, proposal].filter(Boolean).join("\n\n") + "\n",
    ...(review === undefined
      ? {}
      : {
          "review.mdx":
            (names.length
              ? `import { ${names.join(", ")} } from "./proposal.mdx";\n\n`
              : "") +
            review +
            "\n",
        }),
  };
}

// Shard 2's own Proposal and scenarios were written as a separate Change;
// they move verbatim into its Review, collapsed.
function shardTwoReview(shard) {
  const review = shard["review.mdx"].replace(
    /^import \{[^}]*\} from "\.\/proposal\.mdx";\n\n/,
    "",
  );
  const proposal = shard["proposal.mdx"].slice(shard.esm.length).trim();
  return `${shard.esm}\n\n${review.trim()}\n\n<ReviewDetails>\n\n### 原為獨立 Change 頁時的 Proposal\n\n由舊格式機械轉換：這個 shard 原本是 \`${SHARD}\` 自己的 Change 頁，以下是它當時的 Proposal 原文。\n\n${proposal}\n\n</ReviewDetails>\n`;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const local = process.argv.includes("--local");
  const root = await git(process.cwd(), ["rev-parse", "--show-toplevel"]);
  const remote = await resolveRemote(root);
  await fetchChanges(remote, root);

  const parent = await mkdtemp(path.join(os.tmpdir(), "split-pages-"));
  const store = local
    ? path.join(root, "blueprint", "content", "changes")
    : path.join(parent, "store");
  if (!local) {
    await git(root, ["worktree", "add", "--detach", store, REMOTE_REF]);
  }
  try {
    const slugs = (await readdir(store, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name);
    const split = {};
    for (const slug of slugs) {
      const dir = path.join(store, slug);
      if (existsSync(path.join(dir, "proposal.mdx"))) continue;
      split[slug] = splitPage(
        slug,
        await readFile(path.join(dir, "index.mdx"), "utf8"),
      );
    }

    for (const [slug, files] of Object.entries(split)) {
      if (slug === SHARD) continue;
      const dir = path.join(store, slug);
      const isMigration = slug === MIGRATION;
      await writeFile(
        path.join(dir, "index.mdx"),
        isMigration
          ? files.frontmatter.replace(/\n---\s*$/, "\nshards: 2\n---\n")
          : files["index.mdx"],
      );
      await writeFile(path.join(dir, "proposal.mdx"), files["proposal.mdx"]);
      if (files["review.mdx"]) {
        await writeFile(
          path.join(dir, isMigration ? "review-s1.mdx" : "review.mdx"),
          files["review.mdx"],
        );
      }
    }

    const migrationDir = path.join(store, MIGRATION);
    await writeFile(
      path.join(migrationDir, "review-s2.mdx"),
      shardTwoReview(split[SHARD]),
    );
    const [first, second] = await Promise.all(
      [MIGRATION, SHARD].map(async (slug) =>
        JSON.parse(
          await readFile(path.join(store, slug, "facts.json"), "utf8"),
        ),
      ),
    );
    const figures = [
      "commits",
      "filesChanged",
      "insertions",
      "deletions",
      "srcFilesChanged",
    ];
    const item = (shard, facts) => ({
      shard,
      gate: "G2",
      startedAt: facts.startedAt,
      archivedAt: facts.archivedAt,
      ...Object.fromEntries(figures.map((key) => [key, facts[key] ?? null])),
    });
    const items = [item(1, first), item(2, second)];
    await writeFile(
      path.join(migrationDir, "facts.json"),
      `${JSON.stringify(
        {
          ...first,
          converted: true,
          ...Object.fromEntries(
            figures.map((key) => [
              key,
              items.reduce((sum, i) => sum + (i[key] ?? 0), 0),
            ]),
          ),
          archivedAt: [first.archivedAt, second.archivedAt].sort().at(-1),
          decisions: [...new Set([...first.decisions, ...second.decisions])],
          shards: { count: 2, merged: 2, items },
        },
        null,
        2,
      )}\n`,
    );
    await rm(path.join(store, SHARD), { recursive: true });
    if (local) return;

    await git(store, ["add", "-A"]);
    console.log(await git(store, ["status", "--short"]));
    if (dryRun) return;
    await git(store, [
      "commit",
      "-q",
      "-m",
      "docs(changes): split every page into a file per tab and fold spectra-knowledge-promotion into its Migration",
    ]);
    await git(store, ["push", remote, "HEAD:refs/heads/blueprint-changes"]);
    console.log("published");
  } finally {
    if (!local) {
      await git(root, ["worktree", "remove", "--force", store]).catch(() => {});
    }
    await rm(parent, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
