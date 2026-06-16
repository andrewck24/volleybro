/**
 * Audit (dry-run) for the embedded player-reference migration.
 *
 * Scans team lineups and game documents for embedded player references that
 * still carry the legacy `_id` field and reports, WITHOUT writing anything:
 *   - legacy: references still on the legacy `_id` field
 *   - resolvable: legacy references that resolve to a Player (teams) or to a
 *     player snapshot within the same game (games)
 *   - empty: lineup slots with no reference (bare `null` element or null id)
 *   - migrated: references already using `playerId`
 *
 * Scope: `teams.lineups[]`; for games `teams.{side}.players/staffs/lineup`,
 * `sets[].lineups.{home,away}`, and `sets[].entries[]` rally detail players.
 * `substitution.players.in/out` is intentionally out of scope (already a
 * well-named ObjectId reference).
 *
 * Usage: `node --loader ts-node/esm scripts/migrations/lineup-player-id.audit.ts`
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

/** Count a reference object (lineup slot, sub, snapshot, rally player). */
function scanRef(obj: RefObj, resolves: (id: string) => boolean, c: Counts) {
  if (obj.playerId !== undefined && obj._id === undefined) {
    c.migrated++;
    if (refToString(obj.playerId) === null) c.empty++;
    return;
  }
  const id = refToString(obj._id);
  if (id === null) {
    c.empty++;
    return;
  }
  c.legacy++;
  if (resolves(id)) c.resolvable++;
}

function scanSlot(slot: Slot, resolves: (id: string) => boolean, c: Counts) {
  if (slot === null || slot === undefined) {
    c.empty++;
    return;
  }
  scanRef(slot, resolves, c);
  if (
    slot.sub &&
    slot.sub._id !== undefined &&
    slot.sub.playerId === undefined
  ) {
    scanRef(slot.sub, resolves, c);
  }
}

function scanLineup(
  lineup: RawLineup | null | undefined,
  resolves: (id: string) => boolean,
  c: Counts,
) {
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
    (
      await db
        .collection("players")
        .find({}, { projection: { _id: 1 } })
        .toArray()
    ).map((p) => String(p._id)),
  );
  const teamLineups = emptyCounts();
  for (const team of await db.collection("teams").find({}).toArray()) {
    for (const lineup of (team.lineups as RawLineup[] | undefined) ?? []) {
      scanLineup(lineup, (id) => playerIds.has(id), teamLineups);
    }
  }

  // --- games ---
  const gameLineups = emptyCounts();
  const gameSnapshots = emptyCounts();
  const gameRallyDetail = emptyCounts();
  for (const game of await db.collection("games").find({}).toArray()) {
    const teamsField = game.teams as
      | Record<
          string,
          { players?: RefObj[]; staffs?: RefObj[]; lineup?: RawLineup }
        >
      | undefined;
    // Resolve game references against this game's own player snapshots.
    const snapshotIds = new Set<string>();
    for (const side of ["home", "away"]) {
      for (const p of teamsField?.[side]?.players ?? []) {
        const id = refToString(p._id) ?? refToString(p.playerId);
        if (id) snapshotIds.add(id);
      }
    }
    const resolves = (id: string) => snapshotIds.has(id);

    for (const side of ["home", "away"]) {
      const sideTeam = teamsField?.[side];
      for (const p of sideTeam?.players ?? [])
        scanRef(p, (id) => playerIds.has(id), gameSnapshots);
      for (const s of sideTeam?.staffs ?? [])
        scanRef(s, (id) => playerIds.has(id), gameSnapshots);
      scanLineup(sideTeam?.lineup, resolves, gameLineups);
    }

    for (const set of (game.sets as
      | {
          lineups?: { home?: RawLineup; away?: RawLineup };
          entries?: ({ type?: string } & Record<string, unknown>)[];
        }[]
      | undefined) ?? []) {
      scanLineup(set.lineups?.home, resolves, gameLineups);
      scanLineup(set.lineups?.away, resolves, gameLineups);
      for (const entry of set.entries ?? []) {
        if (entry.type !== RALLY) continue;
        for (const side of ["home", "away"] as const) {
          const detail = entry[side] as { player?: RefObj } | undefined;
          if (detail?.player) scanRef(detail.player, resolves, gameRallyDetail);
        }
      }
    }
  }

  console.log("Embedded player-id migration audit (dry-run, no writes)\n");
  console.log("teams.lineups[]:", teamLineups);
  console.log("games teams.{side}.lineup + sets[].lineups.*:", gameLineups);
  console.log("games teams.{side}.players/staffs (snapshots):", gameSnapshots);
  console.log("games sets[].entries[] rally detail player:", gameRallyDetail);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
