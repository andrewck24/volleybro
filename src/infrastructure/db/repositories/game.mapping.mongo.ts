import { EntryType, type Game } from "@/entities/game";
import type { Types } from "mongoose";

/** Raw (persisted) shapes returned by `doc.toObject()`, before id mapping. */
type RawRef = Types.ObjectId | null | undefined;
type RawLineupPlayer = {
  playerId?: RawRef;
  position?: string;
  sub?: { playerId?: RawRef; entryIndex?: { in?: number; out?: number } };
};
type RawLineup = {
  options?: unknown;
  starting?: RawLineupPlayer[];
  liberos?: RawLineupPlayer[];
  substitutes?: RawLineupPlayer[];
};
type RawSnapshot = { playerId?: RawRef } & Record<string, unknown>;
type RawTeam = {
  players?: RawSnapshot[];
  staffs?: RawSnapshot[];
  lineup?: RawLineup;
} & Record<string, unknown>;
type RawRallyDetail = {
  player?: { playerId?: RawRef; zone?: number };
} & Record<string, unknown>;
type RawEntry = {
  type?: EntryType;
  home?: RawRallyDetail;
  away?: RawRallyDetail;
  players?: { in?: RawRef; out?: RawRef };
} & Record<string, unknown>;
export type RawSet = {
  lineups?: { home?: RawLineup; away?: RawLineup };
  entries?: RawEntry[];
} & Record<string, unknown>;

// --- read mapping: persisted playerId -> domain id ---

function mapLineupPlayerRead(p: RawLineupPlayer) {
  return {
    id: p?.playerId?.toString() ?? null,
    position: p?.position,
    sub: p?.sub
      ? {
          id: p.sub.playerId?.toString() ?? null,
          entryIndex: p.sub.entryIndex ?? {},
        }
      : undefined,
  };
}

function toLineupRead(lineup: RawLineup | undefined) {
  if (!lineup) return lineup;
  // The subdocument's own `_id` has no field on `Lineup` and no place in
  // the request the client builds from this value.
  return {
    options: lineup.options,
    starting: (lineup.starting ?? []).map((p) => mapLineupPlayerRead(p)),
    liberos: (lineup.liberos ?? []).map((p) => mapLineupPlayerRead(p)),
    substitutes: (lineup.substitutes ?? []).map((p) => mapLineupPlayerRead(p)),
  };
}

function mapSnapshotRead(snapshot: RawSnapshot) {
  const { playerId, ...rest } = snapshot;
  return { ...rest, id: playerId?.toString() ?? null };
}

function mapTeamRead(team: RawTeam | undefined) {
  if (!team) return team;
  return {
    ...team,
    players: (team.players ?? []).map((p) => mapSnapshotRead(p)),
    staffs: (team.staffs ?? []).map((s) => mapSnapshotRead(s)),
    lineup: team.lineup ? toLineupRead(team.lineup) : team.lineup,
  };
}

function mapRallyDetailRead(detail: RawRallyDetail | undefined) {
  if (!detail?.player) return detail;
  return {
    ...detail,
    player: {
      id: detail.player.playerId?.toString() ?? null,
      zone: detail.player.zone,
    },
  };
}

export function mapEntryRead(entry: RawEntry) {
  if (entry?.type === EntryType.RALLY) {
    return {
      ...entry,
      home: mapRallyDetailRead(entry.home),
      away: mapRallyDetailRead(entry.away),
    };
  }
  if (entry?.type === EntryType.SUBSTITUTION && entry.players) {
    return {
      ...entry,
      players: {
        in: entry.players.in?.toString() ?? entry.players.in,
        out: entry.players.out?.toString() ?? entry.players.out,
      },
    };
  }
  return entry;
}

function mapSetRead(set: RawSet) {
  return {
    ...set,
    lineups: {
      home: toLineupRead(set.lineups?.home),
      away: set.lineups?.away
        ? toLineupRead(set.lineups.away)
        : set.lineups?.away,
    },
    entries: (set.entries ?? []).map((e) => mapEntryRead(e)),
  };
}

export type RawGame = {
  _id: Types.ObjectId;
  teamId: Types.ObjectId;
  teams?: { home?: RawTeam; away?: RawTeam };
  sets?: RawSet[];
} & Record<string, unknown>;

/** Maps the plain object of a stored game (`doc.toObject()`) to the entity. */
export function toGame(obj: RawGame): Game {
  return {
    ...obj,
    id: obj._id.toString(),
    teamId: obj.teamId.toString(),
    teams: {
      home: mapTeamRead(obj.teams?.home),
      away: mapTeamRead(obj.teams?.away),
    },
    sets: (obj.sets ?? []).map((s) => mapSetRead(s)),
  } as unknown as Game;
}

// --- write mapping: domain id -> persisted playerId (Mongoose casts) ---

/** Only `null` casts to an ObjectId ref; absent and empty both mean the same. */
function toPlayerRef(id: string | null | undefined) {
  return id || null;
}

function mapLineupPlayerWrite(p: {
  id?: string | null;
  position?: string;
  sub?: { id?: string; entryIndex?: { in?: number; out?: number } };
}) {
  return {
    playerId: toPlayerRef(p?.id),
    position: p?.position,
    sub: p?.sub
      ? {
          playerId: toPlayerRef(p.sub.id),
          entryIndex: p.sub.entryIndex,
        }
      : undefined,
  };
}

export function toLineupWrite<
  T extends {
    starting?: unknown[];
    liberos?: unknown[];
    substitutes?: unknown[];
  },
>(lineup: T | undefined) {
  if (!lineup) return lineup;
  const map = (arr: unknown[] | undefined) =>
    (arr ?? []).map((p) =>
      mapLineupPlayerWrite(p as Parameters<typeof mapLineupPlayerWrite>[0]),
    );
  return {
    ...lineup,
    starting: map(lineup.starting),
    liberos: map(lineup.liberos),
    substitutes: map(lineup.substitutes),
  };
}

function mapSnapshotWrite(
  snapshot: { id?: string | null } & Record<string, unknown>,
) {
  const { id, ...rest } = snapshot;
  return { ...rest, playerId: toPlayerRef(id) };
}

function mapTeamWrite(
  team:
    | (Record<string, unknown> & {
        players?: unknown[];
        staffs?: unknown[];
        lineup?: {
          starting?: unknown[];
          liberos?: unknown[];
          substitutes?: unknown[];
        };
      })
    | undefined,
) {
  if (!team) return team;
  return {
    ...team,
    players: (team.players ?? []).map((p) =>
      mapSnapshotWrite(p as { id?: string | null } & Record<string, unknown>),
    ),
    staffs: (team.staffs ?? []).map((s) =>
      mapSnapshotWrite(s as { id?: string | null } & Record<string, unknown>),
    ),
    lineup: team.lineup ? toLineupWrite(team.lineup) : team.lineup,
  };
}

function mapRallyDetailWrite(detail: unknown) {
  const d = detail as
    | ({ player?: { id?: string | null; zone?: number } } & Record<
        string,
        unknown
      >)
    | undefined;
  if (!d?.player) return d;
  return {
    ...d,
    player: {
      playerId: toPlayerRef(d.player.id),
      zone: d.player.zone,
    },
  };
}

export function mapEntryWrite(
  entry: Record<string, unknown> & { type?: EntryType },
) {
  if (entry?.type === EntryType.RALLY) {
    return {
      ...entry,
      home: mapRallyDetailWrite(entry.home),
      away: mapRallyDetailWrite(entry.away),
    };
  }
  // Substitution keeps the `players.in/out` field names; only the ids need
  // the same empty-string collapse as every other ObjectId path.
  if (entry?.type === EntryType.SUBSTITUTION) {
    const players = entry.players as
      { in?: string | null; out?: string | null } | undefined;
    if (!players) return entry;
    return {
      ...entry,
      players: {
        in: toPlayerRef(players.in),
        out: toPlayerRef(players.out),
      },
    };
  }
  return entry;
}

function mapSetWrite(
  set: Record<string, unknown> & {
    lineups?: {
      home?: { starting?: unknown[] };
      away?: { starting?: unknown[] };
    };
    entries?: unknown[];
  },
) {
  return {
    ...set,
    lineups: set.lineups
      ? {
          home: toLineupWrite(
            set.lineups.home as Parameters<typeof toLineupWrite>[0],
          ),
          away: set.lineups.away
            ? toLineupWrite(
                set.lineups.away as Parameters<typeof toLineupWrite>[0],
              )
            : set.lineups.away,
        }
      : set.lineups,
    entries: (set.entries ?? []).map((e) =>
      mapEntryWrite(e as Record<string, unknown> & { type?: EntryType }),
    ),
  };
}

export function toGameDoc(data: Partial<Game>) {
  const { id: _id, ...rest } = data;
  void _id;
  const doc: Record<string, unknown> = { ...rest };
  if (data.teams) {
    doc.teams = {
      home: mapTeamWrite(
        data.teams.home as unknown as Parameters<typeof mapTeamWrite>[0],
      ),
      away: mapTeamWrite(
        data.teams.away as unknown as Parameters<typeof mapTeamWrite>[0],
      ),
    };
  }
  if (data.sets) {
    doc.sets = data.sets.map((s) =>
      mapSetWrite(s as unknown as Parameters<typeof mapSetWrite>[0]),
    );
  }
  return doc;
}
