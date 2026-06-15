/**
 * Audit (dry-run) for the lineup player-reference migration.
 *
 * Scans team lineups and game documents for embedded player slots that still
 * carry the legacy `_id` reference and reports, WITHOUT writing anything:
 *   - legacy: slots holding a legacy `_id` reference
 *   - resolvable: legacy slots whose `_id` resolves to a Player (teams) or to a
 *     player snapshot within the same game (games)
 *   - empty: slots with no reference (bare `null` element or `_id`/`playerId` null)
 *   - migrated: slots already using `playerId`
 *
 * Usage: `npx ts-node scripts/migrations/lineup-player-id.audit.ts`
 */
import "dotenv/config";
import mongoose from "mongoose";

const LINEUP_ARRAYS = ["starting", "liberos", "substitutes"] as const;

type Ref = mongoose.Types.ObjectId | string | null | undefined;
type Slot = {
  _id?: Ref;
  playerId?: Ref;
  sub?: { _id?: Ref; playerId?: Ref } | null;
} | null;
type RawLineup = Record<(typeof LINEUP_ARRAYS)[number], Slot[] | undefined>;

interface Counts {
  legacy: number;
  resolvable: number;
  empty: number;
  migrated: number;
}

const emptyCounts = (): Counts => ({
  legacy: 0,
  resolvable: 0,
  empty: 0,
  migrated: 0,
});

const refToString = (ref: Ref): string | null =>
  ref === null || ref === undefined ? null : String(ref);

/** Classify a single slot and its `sub` reference into the running counts. */
function scanSlot(slot: Slot, resolves: (id: string) => boolean, c: Counts) {
  if (slot === null || slot === undefined) {
    c.empty++;
    return;
  }
  // Already migrated: uses `playerId` and no legacy `_id`.
  if (slot.playerId !== undefined && slot._id === undefined) {
    c.migrated++;
    if (refToString(slot.playerId) === null) c.empty++;
  } else {
    const id = refToString(slot._id);
    if (id === null) {
      c.empty++;
    } else {
      c.legacy++;
      if (resolves(id)) c.resolvable++;
    }
  }
  if (slot.sub && slot.sub._id !== undefined && slot.sub.playerId === undefined) {
    const subId = refToString(slot.sub._id);
    if (subId !== null) {
      c.legacy++;
      if (resolves(subId)) c.resolvable++;
    }
  }
}

function scanLineup(lineup: RawLineup | null | undefined, resolves: (id: string) => boolean, c: Counts) {
  if (!lineup) return;
  for (const key of LINEUP_ARRAYS) {
    for (const slot of lineup[key] ?? []) scanSlot(slot, resolves, c);
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Please add MONGODB_URI to env");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database connection");

  // --- teams ---
  const playerIds = new Set(
    (await db.collection("players").find({}, { projection: { _id: 1 } }).toArray()).map(
      (p) => String(p._id),
    ),
  );
  const teamCounts = emptyCounts();
  const teams = await db.collection("teams").find({}).toArray();
  for (const team of teams) {
    for (const lineup of (team.lineups as RawLineup[] | undefined) ?? []) {
      scanLineup(lineup, (id) => playerIds.has(id), teamCounts);
    }
  }

  // --- games ---
  const gameCounts = emptyCounts();
  const games = await db.collection("games").find({}).toArray();
  for (const game of games) {
    const teamsField = game.teams as
      | Record<string, { players?: { _id?: Ref; playerId?: Ref }[]; lineup?: RawLineup }>
      | undefined;
    // A game slot resolves if its id matches a snapshot player id in this game.
    const snapshotIds = new Set<string>();
    for (const side of ["home", "away"]) {
      for (const p of teamsField?.[side]?.players ?? []) {
        const id = refToString(p._id) ?? refToString(p.playerId);
        if (id) snapshotIds.add(id);
      }
    }
    const resolves = (id: string) => snapshotIds.has(id);
    for (const side of ["home", "away"]) {
      scanLineup(teamsField?.[side]?.lineup, resolves, gameCounts);
    }
    for (const set of (game.sets as { lineups?: { home?: RawLineup; away?: RawLineup } }[] | undefined) ?? []) {
      scanLineup(set.lineups?.home, resolves, gameCounts);
      scanLineup(set.lineups?.away, resolves, gameCounts);
    }
  }

  console.log("Lineup player-id migration audit (dry-run, no writes)\n");
  console.log("teams.lineups[]:", teamCounts);
  console.log("games.{teams.*.lineup, sets[].lineups.*}:", gameCounts);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
