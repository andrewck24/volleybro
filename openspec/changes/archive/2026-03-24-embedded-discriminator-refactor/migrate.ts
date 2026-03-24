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
 * Idempotent — safe to re-run. Numeric type values are mapped; string type values are preserved.
 *
 * Usage:
 *   MONGODB_URI=<uri> npx ts-node openspec/changes/embedded-discriminator-refactor/migrate.ts
 */

import { MongoClient } from "mongodb";

const TYPE_MAP: Record<number, string> = {
  0: "Rally",
  1: "Substitution",
  2: "Timeout",
  3: "Challenge",
};

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI environment variable is required");

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const collection = db.collection("records");

  // Step 1: Convert numeric type values to strings (for documents not yet migrated)
  for (const [numStr, strVal] of Object.entries(TYPE_MAP)) {
    const num = Number(numStr);
    await collection.updateMany(
      { "sets.entries.type": num },
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
    console.log(`Converted numeric type ${num} -> "${strVal}"`);
  }

  // Step 2: Flatten data wrapper and rename challenge.data.type -> challengeType
  await collection.updateMany(
    { "sets.entries.data": { $exists: true } },
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
                                          input: { $objectToArray: "$$entry.data" },
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
    ],
  );
  console.log("Flattened entry data wrappers");

  await client.close();
  console.log("Migration complete");
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
