/**
 * Migration: embedded-discriminator-refactor
 *
 * Transforms existing `records` documents from the old entry structure to the new flat structure:
 *
 * 1. Converts `entries[].type` from numeric (0, 1, 2, 3) to string
 *    ("Rally", "Substitution", "Timeout", "Challenge")
 * 2. Lifts `entries[].data.*` fields to `entries[].*` (flatten)
 * 3. Removes the `entries[].data` wrapper field
 * 4. Renames `entries[].data.type` to `entries[].challengeType` for Challenge entries
 *
 * BREAKING CHANGE: `Challenge.type` (the challenge kind, e.g. video review) is renamed to
 * `Challenge.challengeType` to avoid collision with the discriminator key `type` field.
 * Any code reading `challenge.type` for the challenge kind must update to `challenge.challengeType`.
 *
 * Idempotent — safe to re-run. Numeric type values are mapped; string type values are preserved.
 *
 * Usage:
 *   MONGODB_URI=<uri> npx ts-node openspec/changes/archive/.../migrate.ts [--dry-run]
 *
 * Options:
 *   --dry-run   Count affected documents without modifying them
 */

import { MongoClient, ObjectId } from "mongodb";

const BATCH_SIZE = 100;
const DRY_RUN = process.argv.includes("--dry-run");

const TYPE_MAP: Record<number, string> = {
  0: "Rally",
  1: "Substitution",
  2: "Timeout",
  3: "Challenge",
};

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI environment variable is required");

  if (DRY_RUN) console.log("[DRY RUN] No documents will be modified.\n");

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const collection = db.collection("records");

  const totalDocs = await collection.countDocuments();
  console.log(`Total records in collection: ${totalDocs}`);

  // Step 1: Convert numeric type values to strings (for documents not yet migrated)
  for (const [numStr, strVal] of Object.entries(TYPE_MAP)) {
    const num = Number(numStr);
    const filter = { "sets.entries.type": num };
    const affected = await collection.countDocuments(filter);

    if (affected === 0) {
      console.log(`  Type ${num} -> "${strVal}": 0 documents (skipped)`);
      continue;
    }

    if (DRY_RUN) {
      console.log(
        `  Type ${num} -> "${strVal}": ${affected} documents would be updated`,
      );
      continue;
    }

    let processed = 0;
    const cursor = collection.find(filter, { projection: { _id: 1 } });
    let batch: { _id: ObjectId }[] = [];

    for await (const doc of cursor) {
      batch.push(doc);
      if (batch.length >= BATCH_SIZE) {
        const ids = batch.map((d) => d._id);
        const result = await collection.updateMany(
          { _id: { $in: ids }, "sets.entries.type": num },
          [
            {
              $set: {
                sets: {
                  $map: {
                    input: "$sets",
                    as: "set",
                    in: {
                      $mergeObjects: [
                        "$$set",
                        {
                          entries: {
                            $map: {
                              input: "$$set.entries",
                              as: "entry",
                              in: {
                                $cond: {
                                  if: { $eq: ["$$entry.type", num] },
                                  then: {
                                    $mergeObjects: [
                                      "$$entry",
                                      { type: strVal },
                                    ],
                                  },
                                  else: "$$entry",
                                },
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          ],
        );
        processed += result.modifiedCount;
        batch = [];
      }
    }

    // Process remaining batch
    if (batch.length > 0) {
      const ids = batch.map((d) => d._id);
      const result = await collection.updateMany(
        { _id: { $in: ids }, "sets.entries.type": num },
        [
          {
            $set: {
              sets: {
                $map: {
                  input: "$sets",
                  as: "set",
                  in: {
                    $mergeObjects: [
                      "$$set",
                      {
                        entries: {
                          $map: {
                            input: "$$set.entries",
                            as: "entry",
                            in: {
                              $cond: {
                                if: { $eq: ["$$entry.type", num] },
                                then: {
                                  $mergeObjects: ["$$entry", { type: strVal }],
                                },
                                else: "$$entry",
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        ],
      );
      processed += result.modifiedCount;
    }

    console.log(
      `  Type ${num} -> "${strVal}": ${processed}/${affected} documents modified`,
    );
  }

  // Step 2: Flatten data wrapper and rename challenge.data.type -> challengeType
  const flattenFilter = { "sets.entries.data": { $exists: true } };
  const flattenAffected = await collection.countDocuments(flattenFilter);

  if (flattenAffected === 0) {
    console.log("\nFlatten: 0 documents with data wrapper (skipped)");
  } else if (DRY_RUN) {
    console.log(
      `\nFlatten: ${flattenAffected} documents would be updated`,
    );
  } else {
    let processed = 0;
    const cursor = collection.find(flattenFilter, { projection: { _id: 1 } });
    let batch: { _id: ObjectId }[] = [];

    const flattenUpdate = [
      {
        $set: {
          sets: {
            $map: {
              input: "$sets",
              as: "set",
              in: {
                $mergeObjects: [
                  "$$set",
                  {
                    entries: {
                      $map: {
                        input: "$$set.entries",
                        as: "entry",
                        in: {
                          $cond: {
                            if: { $ifNull: ["$$entry.data", false] },
                            then: {
                              $cond: {
                                // Challenge: rename data.type -> challengeType
                                if: { $eq: ["$$entry.type", "Challenge"] },
                                then: {
                                  $mergeObjects: [
                                    { type: "$$entry.type" },
                                    {
                                      $arrayToObject: {
                                        $filter: {
                                          input: {
                                            $objectToArray: "$$entry.data",
                                          },
                                          as: "kv",
                                          cond: { $ne: ["$$kv.k", "type"] },
                                        },
                                      },
                                    },
                                    {
                                      challengeType: "$$entry.data.type",
                                    },
                                  ],
                                },
                                else: {
                                  $mergeObjects: [
                                    { type: "$$entry.type" },
                                    "$$entry.data",
                                  ],
                                },
                              },
                            },
                            else: "$$entry",
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    ];

    for await (const doc of cursor) {
      batch.push(doc);
      if (batch.length >= BATCH_SIZE) {
        const ids = batch.map((d) => d._id);
        const result = await collection.updateMany(
          { _id: { $in: ids }, "sets.entries.data": { $exists: true } },
          flattenUpdate,
        );
        processed += result.modifiedCount;
        batch = [];
      }
    }

    if (batch.length > 0) {
      const ids = batch.map((d) => d._id);
      const result = await collection.updateMany(
        { _id: { $in: ids }, "sets.entries.data": { $exists: true } },
        flattenUpdate,
      );
      processed += result.modifiedCount;
    }

    console.log(
      `\nFlatten: ${processed}/${flattenAffected} documents modified`,
    );
  }

  await client.close();
  console.log(DRY_RUN ? "\n[DRY RUN] Complete." : "\nMigration complete.");
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
