import "server-only";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const CHANGES_ROOT = path.join(process.cwd(), "content", "changes");

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
};

export function isSinglePageChange(slug: string, root = CHANGES_ROOT) {
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
  try {
    return JSON.parse(
      readFileSync(path.join(root, slug, "facts.json"), "utf8"),
    ) as ChangeFacts;
  } catch {
    return {};
  }
}
