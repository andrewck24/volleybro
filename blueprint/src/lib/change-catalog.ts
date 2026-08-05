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

export async function loadChangeCatalog(
  contentRoot = path.join(process.cwd(), "content", "changes"),
): Promise<ChangeRecord[]> {
  const records = await Promise.all(
    CHANGE_STATUSES.map(async (status) => {
      const directory = STATUS_DIRECTORIES[status];
      const statusRoot = path.join(contentRoot, directory);
      const entries = await readdir(statusRoot, { withFileTypes: true });

      return Promise.all(
        entries
          .filter((entry) => entry.isDirectory())
          .map(async (entry) => {
            const metadata = JSON.parse(
              await readFile(
                path.join(statusRoot, entry.name, "change.json"),
                "utf8",
              ),
            );
            return parseChangeMetadata(metadata, status, entry.name, directory);
          }),
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
