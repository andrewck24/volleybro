import "server-only";

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  CHANGE_STATUSES,
  type ChangeRecord,
  type ChangeStatus,
} from "@/lib/change-types";
import { parseChangeMetadata } from "@/lib/change-metadata";

const STATUS_DIRECTORIES: Record<ChangeStatus, string> = {
  discussing: "discussing",
  "in-progress": "in-progress",
  archived: "archive",
};

const DIRECTORY_STATUSES = new Map(
  CHANGE_STATUSES.map((status) => [STATUS_DIRECTORIES[status], status]),
);

async function readChange(
  contentRoot: string,
  statusDirectory: string,
  changeDirectory: string,
): Promise<ChangeRecord> {
  const metadata = JSON.parse(
    await readFile(
      path.join(contentRoot, statusDirectory, changeDirectory, "change.json"),
      "utf8",
    ),
  );
  const change = parseChangeMetadata(
    metadata,
    changeDirectory,
    statusDirectory,
  );

  // The lifecycle directories survive until they are flattened away, so the
  // derived status still has to agree with the one the directory implies.
  if (change.status !== DIRECTORY_STATUSES.get(statusDirectory)) {
    throw new Error(
      `${changeDirectory}/change.json has a lifecycle that does not belong in ${statusDirectory}/`,
    );
  }

  return change;
}

/**
 * Canonical metadata for one Change, read from its `change.json`. The Overview
 * page renders these facts instead of restating them as MDX props.
 *
 * Returns undefined only for a directory that is not a lifecycle directory. A
 * Change whose `change.json` is missing or invalid throws, so a broken contract
 * fails the Blueprint build instead of silently rendering an empty Overview.
 */
export async function loadChangeMetadata(
  statusDirectory: string,
  changeDirectory: string,
  contentRoot = path.join(process.cwd(), "content", "changes"),
): Promise<ChangeRecord | undefined> {
  if (!DIRECTORY_STATUSES.has(statusDirectory)) return undefined;

  return readChange(contentRoot, statusDirectory, changeDirectory);
}

export async function loadChangeCatalog(
  contentRoot = path.join(process.cwd(), "content", "changes"),
): Promise<ChangeRecord[]> {
  const records = await Promise.all(
    CHANGE_STATUSES.map(async (status) => {
      const statusDirectory = STATUS_DIRECTORIES[status];
      const entries = await readdir(path.join(contentRoot, statusDirectory), {
        withFileTypes: true,
      });

      return Promise.all(
        entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => readChange(contentRoot, statusDirectory, entry.name)),
      );
    }),
  );

  return records
    .flat()
    .sort((left, right) =>
      (right.archivedAt ?? right.startedAt).localeCompare(
        left.archivedAt ?? left.startedAt,
      ),
    );
}
