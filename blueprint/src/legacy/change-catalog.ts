// Compatibility layer for old-format Change pages; delete once no old-format Change remains.

import "server-only";

import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import type { ChangeRecord } from "@/legacy/change-types";
import { SLUG_PATTERN, parseChangeMetadata } from "@/legacy/change-metadata";

export const CHANGES_ROOT = path.join(process.cwd(), "content", "changes");

/** A slug is old-format when its directory carries a `change.json`. */
export function isLegacySlug(
  slug: string,
  contentRoot = CHANGES_ROOT,
): boolean {
  return (
    SLUG_PATTERN.test(slug) &&
    existsSync(path.join(contentRoot, slug, "change.json"))
  );
}

export async function loadChangeMetadata(
  changeDirectory: string,
  contentRoot = CHANGES_ROOT,
): Promise<ChangeRecord> {
  if (!SLUG_PATTERN.test(changeDirectory)) {
    throw new Error(`Unsupported Change directory: ${changeDirectory}`);
  }

  const metadata = JSON.parse(
    await readFile(
      path.join(contentRoot, changeDirectory, "change.json"),
      "utf8",
    ),
  );
  return parseChangeMetadata(metadata, changeDirectory);
}

export async function loadLegacyChangeCatalog(
  contentRoot = CHANGES_ROOT,
): Promise<ChangeRecord[]> {
  const entries = await readdir(contentRoot, { withFileTypes: true });
  const records = await Promise.all(
    entries
      .filter(
        (entry) => entry.isDirectory() && isLegacySlug(entry.name, contentRoot),
      )
      .map((entry) => loadChangeMetadata(entry.name, contentRoot)),
  );

  return records.sort((left, right) =>
    (right.archivedAt ?? right.startedAt).localeCompare(
      left.archivedAt ?? left.startedAt,
    ),
  );
}
