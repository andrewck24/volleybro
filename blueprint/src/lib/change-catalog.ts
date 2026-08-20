import "server-only";

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import type { ChangeRecord } from "@/lib/change-types";
import { SLUG_PATTERN, parseChangeMetadata } from "@/lib/change-metadata";

export const CHANGES_ROOT = path.join(process.cwd(), "content", "changes");

/**
 * Canonical metadata for one Change, read from its `change.json`. The Overview
 * page renders these facts instead of restating them as MDX props.
 *
 * A Change whose `change.json` is missing or invalid throws, so a broken
 * contract fails the Blueprint build instead of silently rendering an empty
 * Overview.
 */
export async function loadChangeMetadata(
  changeDirectory: string,
  contentRoot = CHANGES_ROOT,
): Promise<ChangeRecord> {
  // The directory name reaches here from a route parameter, so it is checked
  // before it becomes a path. parseChangeMetadata validates it again against
  // the slug, but only after the file has been read.
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

export async function loadChangeCatalog(
  contentRoot = CHANGES_ROOT,
): Promise<ChangeRecord[]> {
  const entries = await readdir(contentRoot, { withFileTypes: true });
  const records = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => loadChangeMetadata(entry.name, contentRoot)),
  );

  return records.sort((left, right) =>
    (right.archivedAt ?? right.startedAt).localeCompare(
      left.archivedAt ?? left.startedAt,
    ),
  );
}
