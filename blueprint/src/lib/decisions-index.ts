import "server-only";

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  parseDecisionRecord,
  type DecisionRecord,
} from "@/lib/decision-record";

const DECISIONS_ROOT = path.join(process.cwd(), "content", "decisions");

// Read and parse once at module scope: a malformed record then fails the
// build, not a request.
const records = readdirSync(DECISIONS_ROOT)
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
