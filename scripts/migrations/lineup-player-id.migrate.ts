/**
 * One-time, idempotent migration for the embedded player-reference rename.
 *
 * Converts embedded player references stored under the legacy `_id` path to the
 * `playerId` field and normalizes empty lineup slots to `{ playerId: null, ... }`.
 *
 * Scope: `teams.lineups[]`; for games `teams.{side}.players/staffs/lineup`,
 * `sets[].lineups.{home,away}`, and `sets[].entries[]` rally detail players.
 * `substitution.players.in/out` is left intact (already a well-named ObjectId
 * reference).
 *
 * Idempotent: references already on `playerId` are untouched, so a second run
 * reports zero modifications.
 *
 * Usage: `node --loader ts-node/esm scripts/migrations/lineup-player-id.migrate.ts`
 */
import { config } from "dotenv";
import mongoose from "mongoose";

config({ path: ".env.local" });
config();

const LINEUP_ARRAYS = ["starting", "liberos", "substitutes"] as const;
const RALLY = "Rally"; // EntryType.RALLY

type Ref = mongoose.Types.ObjectId | string | null | undefined;
type RefObj = { _id?: Ref; playerId?: Ref } & Record<string, unknown>;
type Slot = (RefObj & { sub?: RefObj | null }) | null;
type RawLineup = Record<(typeof LINEUP_ARRAYS)[number], Slot[] | undefined> &
  Record<string, unknown>;

/** Rename `_id -> playerId` on a reference object in place; returns whether it changed. */
function migrateRef(obj: RefObj): boolean {
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

/** Normalize a lineup slot; returns the slot and whether it changed. */
function migrateSlot(slot: Slot): { slot: Slot; changed: boolean } {
  if (slot === null || slot === undefined) {
    return { slot: { playerId: null }, changed: true };
  }
  let changed = migrateRef(slot);
  if (slot.sub && typeof slot.sub === "object" && "_id" in slot.sub) {
    changed = migrateRef(slot.sub) || changed;
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
  for (const team of await db.collection("teams").find({}).toArray()) {
    const lineups = (team.lineups as RawLineup[] | undefined) ?? [];
    let changed = false;
    for (const lineup of lineups) if (migrateLineup(lineup)) changed = true;
    if (changed) {
      await db
        .collection("teams")
        .updateOne({ _id: team._id }, { $set: { lineups } });
      teamsModified++;
    }
  }

  // --- games ---
  let gamesModified = 0;
  for (const game of await db.collection("games").find({}).toArray()) {
    const teamsField = game.teams as
      | Record<
          string,
          {
            players?: RefObj[];
            staffs?: RefObj[];
            lineup?: RawLineup;
          } & Record<string, unknown>
        >
      | undefined;
    const sets = (game.sets as
      | ({
          lineups?: { home?: RawLineup; away?: RawLineup };
          entries?: ({ type?: string } & Record<string, unknown>)[];
        } & Record<string, unknown>)[]
      | undefined) ?? [];
    let changed = false;

    for (const side of ["home", "away"]) {
      const sideTeam = teamsField?.[side];
      for (const p of sideTeam?.players ?? []) if (migrateRef(p)) changed = true;
      for (const s of sideTeam?.staffs ?? []) if (migrateRef(s)) changed = true;
      if (sideTeam?.lineup && migrateLineup(sideTeam.lineup)) changed = true;
    }

    for (const set of sets) {
      if (set.lineups?.home && migrateLineup(set.lineups.home)) changed = true;
      if (set.lineups?.away && migrateLineup(set.lineups.away)) changed = true;
      for (const entry of set.entries ?? []) {
        if (entry.type !== RALLY) continue;
        for (const side of ["home", "away"] as const) {
          const detail = entry[side] as { player?: RefObj } | undefined;
          if (detail?.player && "_id" in detail.player) {
            if (migrateRef(detail.player)) changed = true;
          }
        }
      }
    }

    if (changed) {
      await db
        .collection("games")
        .updateOne({ _id: game._id }, { $set: { teams: teamsField, sets } });
      gamesModified++;
    }
  }

  console.log("Embedded player-id migration complete");
  console.log(`teams modified: ${teamsModified}`);
  console.log(`games modified: ${gamesModified}`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
