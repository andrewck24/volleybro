/**
 * Type-decoupling migration: records -> games.
 *
 * Covered schema migration scope (dev...type-decoupling):
 * 1. Collection rename: `records` -> `games`
 * 2. Document field rename: `team_id` -> `teamId`
 * 3. Index alignment: `{ team_id: 1 }` -> `{ teamId: 1 }`
 *
 * Note:
 * - Team schema refactors in this change (embedded sub-schema `_id: false`, ref label tidy-up)
 *   do not require data backfill in persisted documents.
 *
 * Usage:
 *   MONGODB_URI="mongodb://..." pnpm ts-node openspec/changes/archive/2026-04-08-type-decoupling/migrate-rename-records-to-games.ts
 *
 * Optional:
 *   MONGODB_DB_NAME="volleybro" (override DB name from URI)
 *
 * Rollback:
 * 1. Rename collection back:
 *    db.games.renameCollection("records")
 * 2. Revert field rename:
 *    db.records.updateMany(
 *      { teamId: { $exists: true } },
 *      [
 *        { $set: { team_id: "$teamId" } },
 *        { $unset: "teamId" },
 *      ],
 *    )
 * 3. Restore old index and remove new index if needed.
 */

import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbNameFromEnv = process.env.MONGODB_DB_NAME;

if (!uri) {
  throw new Error("MONGODB_URI is required");
}

const client = new MongoClient(uri);

const getCollectionNames = async (db: Db): Promise<Set<string>> => {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  return new Set(collections.map((c) => c.name));
};

const ensureCollectionState = async (db: Db): Promise<void> => {
  const names = await getCollectionNames(db);
  const hasRecords = names.has("records");
  const hasGames = names.has("games");

  if (hasRecords && hasGames) {
    throw new Error(
      "Both 'records' and 'games' collections exist. Resolve manually before migration.",
    );
  }

  if (!hasRecords && !hasGames) {
    throw new Error(
      "Neither 'records' nor 'games' collection exists. Nothing to migrate.",
    );
  }
};

const renameCollectionIfNeeded = async (db: Db): Promise<void> => {
  const names = await getCollectionNames(db);
  if (names.has("records") && !names.has("games")) {
    await db.collection("records").rename("games");
    console.log("[MIGRATE] Renamed collection: records -> games");
  } else {
    console.log("[MIGRATE] Collection rename skipped (already using games)");
  }
};

const migrateTeamIdField = async (db: Db): Promise<void> => {
  const result = await db.collection("games").updateMany(
    { team_id: { $exists: true } },
    [
      { $set: { teamId: "$team_id" } },
      { $unset: "team_id" },
    ],
  );

  console.log(
    `[MIGRATE] team_id -> teamId | matched=${result.matchedCount}, modified=${result.modifiedCount}`,
  );
};

const alignIndex = async (db: Db): Promise<void> => {
  const collection = db.collection("games");
  const indexes = await collection.indexes();

  const hasLegacyIndex = indexes.some((idx) => idx.name === "team_id_1");
  if (hasLegacyIndex) {
    await collection.dropIndex("team_id_1");
    console.log("[MIGRATE] Dropped legacy index: team_id_1");
  }

  await collection.createIndex({ teamId: 1 }, { name: "teamId_1" });
  console.log("[MIGRATE] Ensured index: teamId_1");
};

const verifyMigration = async (db: Db): Promise<void> => {
  const names = await getCollectionNames(db);
  if (!names.has("games")) {
    throw new Error("Verification failed: 'games' collection not found");
  }

  if (names.has("records")) {
    throw new Error("Verification failed: legacy 'records' collection still exists");
  }

  const collection = db.collection("games");
  const total = await collection.countDocuments();
  const legacyFieldCount = await collection.countDocuments({ team_id: { $exists: true } });
  const missingNewFieldCount = await collection.countDocuments({
    $or: [{ teamId: { $exists: false } }, { teamId: null }],
  });

  if (legacyFieldCount > 0) {
    throw new Error(
      `Verification failed: ${legacyFieldCount} documents still contain team_id`,
    );
  }

  if (total > 0 && missingNewFieldCount > 0) {
    throw new Error(
      `Verification failed: ${missingNewFieldCount} documents are missing teamId`,
    );
  }

  const indexes = await collection.indexes();
  const hasTeamIdIndex = indexes.some((idx) => idx.name === "teamId_1");
  if (!hasTeamIdIndex) {
    throw new Error("Verification failed: index teamId_1 is missing");
  }

  console.log("[VERIFY] Migration checks passed");
  console.log(
    `[VERIFY] games docs=${total}, missing teamId=${missingNewFieldCount}, legacy team_id=${legacyFieldCount}`,
  );
};

const main = async (): Promise<void> => {
  await client.connect();

  const db = dbNameFromEnv ? client.db(dbNameFromEnv) : client.db();
  console.log(`[INFO] Connected DB: ${db.databaseName}`);

  await ensureCollectionState(db);
  await renameCollectionIfNeeded(db);
  await migrateTeamIdField(db);
  await alignIndex(db);
  await verifyMigration(db);

  console.log("[DONE] type-decoupling migration completed successfully");
};

try {
  await main();
} finally {
  await client.close();
}
