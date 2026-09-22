import "server-only";

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  parseDecisionRecord,
  type DecisionRecord,
} from "@/lib/decision-record";

const DECISIONS_ROOT = path.join(process.cwd(), "content", "decisions");

// A Proposal page can be published, and pulled into a build, before this
// checkout has a content/decisions/ directory at all (it merges later with
// the rest of this Change) — treat that the same as an empty index rather
// than failing the build.
function listDecisionFiles(): string[] {
  try {
    return readdirSync(DECISIONS_ROOT);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

// Read and parse once at module scope: a malformed record then fails the
// build, not a request.
const records = listDecisionFiles()
  .filter((name) => name.endsWith(".json"))
  .map((name) =>
    parseDecisionRecord(
      JSON.parse(readFileSync(path.join(DECISIONS_ROOT, name), "utf8")),
    ),
  );

function decisionNumber(record: DecisionRecord): number {
  return Number(record.id);
}

export function decisionsFor(capability: string): DecisionRecord[] {
  return records
    .filter((record) => record.capabilities.includes(capability))
    .sort((a, b) => decisionNumber(a) - decisionNumber(b));
}

// A Proposal page is published at a gate before its own records merge, so it
// names ids it may not have yet; ids the checkout does not have are skipped
// rather than thrown, in the order asked.
export function decisionsById(ids: string[]): DecisionRecord[] {
  const byId = new Map(records.map((record) => [record.id, record]));
  return ids.flatMap((id) => {
    const record = byId.get(id);
    return record ? [record] : [];
  });
}
