import "server-only";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const CHANGES_ROOT = path.join(process.cwd(), "content", "changes");

export type ChangeFacts = {
  gate?: "G1" | "G2";
  publishedAt?: string;
  commits?: number | null;
  filesChanged?: number | null;
  insertions?: number | null;
  deletions?: number | null;
  srcFilesChanged?: number | null;
  scenarios?: number | null;
  decisions?: string[];
};

// ADR-0072: a directory with index.mdx and no change.json is a single-page
// Change; change.json marks the old format, which keeps its own layer.
export function isSinglePageChange(slug: string, root = CHANGES_ROOT) {
  const dir = path.join(root, slug);
  return (
    existsSync(path.join(dir, "index.mdx")) &&
    !existsSync(path.join(dir, "change.json"))
  );
}

// The frontmatter schema strips unknown keys, so capabilities are read from
// the file itself rather than from the parsed page data.
export function readCapabilities(slug: string, root = CHANGES_ROOT): string[] {
  try {
    const content = readFileSync(path.join(root, slug, "index.mdx"), "utf8");
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    const line = frontmatter.match(/^capabilities:\s*(\[.*\])\s*$/m)?.[1];
    const parsed: unknown = line ? JSON.parse(line) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
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
