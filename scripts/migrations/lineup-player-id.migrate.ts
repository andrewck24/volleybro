/**
 * One-time, idempotent migration for the lineup player-reference rename.
 *
 * Converts embedded lineup slots stored under the legacy `_id` path to the
 * `playerId` field and normalizes empty slots to `{ playerId: null, ... }`.
 * Scope (matching the audit): `teams.lineups[]`, `games.teams.{side}.lineup`,
 * and `games.sets[].lineups.{home,away}`. `substitution.players.in/out` is left
 * intact (already a well-named ObjectId reference).
 *
 * Idempotent: slots already on `playerId` are untouched, so a second run reports
 * zero modifications.
 *
 * Usage: `npx ts-node scripts/migrations/lineup-player-id.migrate.ts`
 */
import "dotenv/config";
import mongoose from "mongoose";

const LINEUP_ARRAYS = ["starting", "liberos", "substitutes"] as const;

type Ref = mongoose.Types.ObjectId | string | null | undefined;
type Slot =
  | ({ _id?: Ref; playerId?: Ref; sub?: Record<string, unknown> | null } & Record<
      string,
      unknown
    >)
  | null;
type RawLineup = Record<(typeof LINEUP_ARRAYS)[number], Slot[] | undefined> &
  Record<string, unknown>;

/** Rename `_id -> playerId` on a single reference object; returns whether it changed. */
function migrateRef(obj: Record<string, unknown>): boolean {
  if ("_id" in obj) {
    obj.playerId = (obj._id as Ref) ?? null;
    delete obj._id;
    return true;
  }
  if (!("playerId" in obj)) {
    obj.playerId = null;
    return true;
  }
  return false;
}

/** Normalize a lineup slot in place; returns whether it changed. */
function migrateSlot(slot: Slot): { slot: Slot; changed: boolean } {
  if (slot === null || slot === undefined) {
    return { slot: { playerId: null }, changed: true };
  }
  let changed = migrateRef(slot);
  if (slot.sub && typeof slot.sub === "object") {
    if ("_id" in slot.sub) {
      changed = migrateRef(slot.sub) || changed;
    }
  }
  return { slot, changed };
}

function migrateLineup(lineup: RawLineup | null | undefined): boolean {
  if (!lineup) return false;
  let changed = false;
  for (const key of LINEUP_ARRAYS) {
    const arr = lineup[key];
    if (!arr) continue;
    lineup[key] = arr.map((slot) => {
      const result = migrateSlot(slot);
      if (result.changed) changed = true;
      return result.slot;
    });
  }
  return changed;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Please add MONGODB_URI to env");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database connection");

  // --- teams ---
  let teamsModified = 0;
  const teams = await db.collection("teams").find({}).toArray();
  for (const team of teams) {
    const lineups = (team.lineups as RawLineup[] | undefined) ?? [];
    let changed = false;
    for (const lineup of lineups) {
      if (migrateLineup(lineup)) changed = true;
    }
    if (changed) {
      await db.collection("teams").updateOne({ _id: team._id }, { $set: { lineups } });
      teamsModified++;
    }
  }

  // --- games ---
  let gamesModified = 0;
  const games = await db.collection("games").find({}).toArray();
  for (const game of games) {
    const teamsField = game.teams as
      | Record<string, { lineup?: RawLineup } & Record<string, unknown>>
      | undefined;
    const sets = (game.sets as
      | ({ lineups?: { home?: RawLineup; away?: RawLineup } } & Record<string, unknown>)[]
      | undefined) ?? [];
    let changed = false;

    for (const side of ["home", "away"]) {
      if (teamsField?.[side]?.lineup && migrateLineup(teamsField[side].lineup)) {
        changed = true;
      }
    }
    for (const set of sets) {
      if (set.lineups?.home && migrateLineup(set.lineups.home)) changed = true;
      if (set.lineups?.away && migrateLineup(set.lineups.away)) changed = true;
    }

    if (changed) {
      await db
        .collection("games")
        .updateOne({ _id: game._id }, { $set: { teams: teamsField, sets } });
      gamesModified++;
    }
  }

  console.log("Lineup player-id migration complete");
  console.log(`teams modified: ${teamsModified}`);
  console.log(`games modified: ${gamesModified}`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
