import "server-only";

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const CHANGES_ROOT = path.join(process.cwd(), "content", "changes");

export type ShardFacts = {
  shard: number;
  gate?: "G1" | "G2";
  startedAt?: string;
  archivedAt?: string | null;
  commits?: number | null;
  filesChanged?: number | null;
  insertions?: number | null;
  deletions?: number | null;
  srcFilesChanged?: number | null;
};

export type ChangeFacts = {
  converted?: boolean;
  gate?: "G1" | "G2";
  publishedAt?: string;
  startedAt?: string;
  archivedAt?: string | null;
  commits?: number | null;
  filesChanged?: number | null;
  insertions?: number | null;
  deletions?: number | null;
  srcFilesChanged?: number | null;
  scenarios?: number | null;
  decisions?: string[];
  shards?: {
    count: number;
    current?: number;
    merged: number;
    items: ShardFacts[];
  };
};

export function hasChangePage(slug: string, root = CHANGES_ROOT) {
  return existsSync(path.join(root, slug, "index.mdx"));
}

// The frontmatter schema strips unknown keys, so capabilities are read from
// the file itself rather than from the parsed page data.
export function readCapabilities(slug: string, root = CHANGES_ROOT): string[] {
  try {
    const content = readFileSync(path.join(root, slug, "index.mdx"), "utf8");
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    const inline = frontmatter.match(/^capabilities:\s*\[(.*)\]\s*$/m)?.[1];
    if (inline !== undefined) {
      return [...inline.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
    }
    const list = frontmatter.match(
      /^capabilities:\s*\n((?:\s+-\s+.*\n?)+)/m,
    )?.[1];
    return list
      ? [...list.matchAll(/-\s+["']?([^"'\n]+?)["']?\s*$/gm)].map((m) => m[1])
      : [];
  } catch {
    return [];
  }
}

// facts.json is written by the publish script (ADR-0074) and is absent on a
// draft that was never published.
export function readFacts(slug: string, root = CHANGES_ROOT): ChangeFacts {
  let facts: ChangeFacts;
  try {
    facts = JSON.parse(
      readFileSync(path.join(root, slug, "facts.json"), "utf8"),
    ) as ChangeFacts;
  } catch {
    return {};
  }

  if (facts.converted) return facts;
  try {
    const overlay = JSON.parse(
      readFileSync(
        path.join(root, "..", "..", ".change-lifecycle.json"),
        "utf8",
      ),
    ) as {
      changes?: Record<
        string,
        { inputHash: string; facts: Partial<ChangeFacts> }
      >;
    };
    const entry = overlay.changes?.[slug];
    if (!entry || entry.inputHash !== changeInputHash(path.join(root, slug))) {
      return facts;
    }
    return { ...facts, ...entry.facts };
  } catch {
    return facts;
  }
}

function changeInputHash(directory: string): string {
  const hash = createHash("sha256");
  const files: string[] = [];
  const visit = (current: string, prefix = "") => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      const relative = path.posix.join(prefix, entry.name);
      if (entry.isDirectory()) visit(file, relative);
      else if (entry.isFile()) files.push(relative);
    }
  };
  visit(directory);
  for (const relative of files.sort()) {
    hash
      .update(relative)
      .update("\0")
      .update(readFileSync(path.join(directory, relative)));
  }
  return hash.digest("hex");
}
