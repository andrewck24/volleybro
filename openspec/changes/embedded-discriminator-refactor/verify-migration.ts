/**
 * Verification: embedded-discriminator-refactor migration
 *
 * Scans all documents in the `records` collection and validates:
 * 1. Every entry.type is a valid string ("Rally", "Substitution", "Timeout", "Challenge")
 * 2. No entry contains a `data` wrapper field
 * 3. Challenge entries use `challengeType` (not nested `type` inside `data`)
 *
 * Usage:
 *   MONGODB_URI=<uri> npx ts-node openspec/changes/embedded-discriminator-refactor/verify-migration.ts
 */

import { MongoClient } from "mongodb";

const VALID_TYPES = new Set(["Rally", "Substitution", "Timeout", "Challenge"]);

interface Failure {
  recordId: string;
  setIndex: number;
  entryIndex: number;
  reason: string;
}

async function verify() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI environment variable is required");

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const collection = db.collection("records");

  const failures: Failure[] = [];
  let totalRecords = 0;
  let totalEntries = 0;

  const cursor = collection.find({});
  for await (const doc of cursor) {
    totalRecords++;
    const sets: unknown[] = doc.sets ?? [];

    for (let si = 0; si < sets.length; si++) {
      const set = sets[si] as { entries?: unknown[] };
      const entries = set.entries ?? [];

      for (let ei = 0; ei < entries.length; ei++) {
        totalEntries++;
        const entry = entries[ei] as Record<string, unknown>;
        const ctx = { recordId: String(doc._id), setIndex: si, entryIndex: ei };

        // Check 1: type must be a valid string
        if (typeof entry.type !== "string" || !VALID_TYPES.has(entry.type)) {
          failures.push({
            ...ctx,
            reason: `invalid type: ${JSON.stringify(entry.type)} (expected one of ${[...VALID_TYPES].join(", ")})`,
          });
        }

        // Check 2: no `data` wrapper
        if ("data" in entry) {
          failures.push({ ...ctx, reason: "entry still has `data` wrapper" });
        }

        // Check 3: Challenge entries must have challengeType, not nested type
        if (entry.type === "Challenge") {
          if (!("challengeType" in entry)) {
            failures.push({
              ...ctx,
              reason: "Challenge entry missing `challengeType` field",
            });
          }
        }
      }
    }
  }

  await client.close();

  // Report
  console.log("\n=== Migration Verification Report ===");
  console.log(`Records scanned: ${totalRecords}`);
  console.log(`Entries scanned: ${totalEntries}`);

  if (failures.length === 0) {
    console.log("\nResult: PASS — all entries conform to the new schema.\n");
  } else {
    console.log(`\nResult: FAIL — ${failures.length} issue(s) found:\n`);
    for (const f of failures) {
      console.log(
        `  [${f.recordId}] set[${f.setIndex}].entry[${f.entryIndex}]: ${f.reason}`,
      );
    }
    console.log();
    process.exit(1);
  }
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
