import { ValidationError, CommonReason } from "@/entities/errors";
import { Lineup } from "@/entities/team";

export enum MatchPhase {
  NONE,
  ELIM,
  SEED,
  QUAL,
  FINAL,
}
export enum MatchDivision {
  NONE,
  MEN,
  WOMEN,
  MIXED,
}
export enum MatchCategory {
  NONE,
  SENIOR,
  JUNIOR,
  YOUTH,
}

export type Match = {
  id?: string;
  name?: string;
  number?: number;
  phase?: MatchPhase;
  division?: MatchDivision;
  category?: MatchCategory;
  scoring: {
    setCount: number;
    decidingSetPoints: number;
  };
  location?: {
    city?: string;
    hall?: string;
  };
  time?: {
    date?: Date;
    start?: string;
    end?: string;
  };
  weather?: {
    temperature: number;
  };
};

export enum MoveType {
  SERVING = 1,
  BLOCKING,
  ATTACK,
  RECEPTION,
  DEFENSE,
  SETTING,
  UNFORCED,
}

type PlayerStatsMoveType = Exclude<MoveType, MoveType.UNFORCED>;

export type PlayerStats = {
  [key in PlayerStatsMoveType]: {
    success: number;
    error: number;
  };
};

export class PlayerStatsClass implements PlayerStats {
  [MoveType.SERVING]: { success: number; error: number };
  [MoveType.BLOCKING]: { success: number; error: number };
  [MoveType.ATTACK]: { success: number; error: number };
  [MoveType.RECEPTION]: { success: number; error: number };
  [MoveType.DEFENSE]: { success: number; error: number };
  [MoveType.SETTING]: { success: number; error: number };

  constructor() {
    this[MoveType.SERVING] = { success: 0, error: 0 };
    this[MoveType.BLOCKING] = { success: 0, error: 0 };
    this[MoveType.ATTACK] = { success: 0, error: 0 };
    this[MoveType.RECEPTION] = { success: 0, error: 0 };
    this[MoveType.DEFENSE] = { success: 0, error: 0 };
    this[MoveType.SETTING] = { success: 0, error: 0 };
  }
}

export type Player = {
  id: string;
  name: string;
  number: number;
};

/**
 * Validate that every player id referenced by a lineup exists on the roster.
 * A null lineup reference is an unfilled slot and is skipped. A null roster id
 * is dropped rather than stringified, so a lineup cannot reach it by naming the
 * literal "null".
 * Throws ValidationError if the lineup shape is malformed or a referenced id
 * is not on the roster.
 */
export function validateLineupPlayers(lineup: Lineup, roster: Player[]): void {
  // The lineup arrives unvalidated from the request body, so reject a
  // malformed shape here instead of letting a spread throw a raw TypeError.
  if (
    lineup == null ||
    typeof lineup !== "object" ||
    !Array.isArray(lineup.starting) ||
    !Array.isArray(lineup.liberos) ||
    !Array.isArray(lineup.substitutes)
  ) {
    throw new ValidationError(
      CommonReason.INVALID_INPUT,
      "Lineup shape is malformed",
    );
  }

  const rosterIds = new Set(
    roster
      .filter((player) => player.id != null)
      .map((player) => String(player.id)),
  );

  const referencedIds = [
    ...lineup.starting,
    ...lineup.liberos,
    ...lineup.substitutes,
  ].flatMap((entry) => [entry.id, entry.sub?.id ?? null]);

  for (const id of referencedIds) {
    if (id != null && !rosterIds.has(String(id))) {
      throw new ValidationError(
        CommonReason.INVALID_INPUT,
        "Lineup references a player not on the team roster",
      );
    }
  }
}

export type TeamStats = PlayerStats & {
  [MoveType.UNFORCED]: { success: number; error: number };
  rotation: number;
  timeout: number;
  substitution: number;
  challenge: number;
};

export class TeamStatsClass implements TeamStats {
  [MoveType.SERVING]: { success: number; error: number };
  [MoveType.BLOCKING]: { success: number; error: number };
  [MoveType.ATTACK]: { success: number; error: number };
  [MoveType.RECEPTION]: { success: number; error: number };
  [MoveType.DEFENSE]: { success: number; error: number };
  [MoveType.SETTING]: { success: number; error: number };
  [MoveType.UNFORCED]: { success: number; error: number };
  rotation: number;
  timeout: number;
  substitution: number;
  challenge: number;

  constructor() {
    this[MoveType.SERVING] = { success: 0, error: 0 };
    this[MoveType.BLOCKING] = { success: 0, error: 0 };
    this[MoveType.ATTACK] = { success: 0, error: 0 };
    this[MoveType.RECEPTION] = { success: 0, error: 0 };
    this[MoveType.DEFENSE] = { success: 0, error: 0 };
    this[MoveType.SETTING] = { success: 0, error: 0 };
    this[MoveType.UNFORCED] = { success: 0, error: 0 };
    this.rotation = 0;
    this.timeout = 2;
    this.substitution = 6;
    this.challenge = 2;
  }
}

export type Staff = {
  id: string;
  name: string;
  number: number;
  position: "" | "C" | "AC" | "T" | "M";
};

export type Team = {
  id: string;
  name: string;
  players: Player[];
  staffs: Staff[];
  lineup?: Lineup;
};

export type RallyDetail = {
  score: number;
  type: MoveType;
  num: number;
  player?: {
    id: string;
    zone: number;
  };
};

export type Rally = {
  win: boolean;
  home: RallyDetail;
  away: RallyDetail;
};

export enum Side {
  HOME = 1,
  AWAY = 0,
}

export type Substitution = {
  team: Side;
  players: {
    in: string;
    out: string;
  };
};

export type Timeout = {
  team: Side;
};

export type Challenge = {
  team: Side;
  challengeType: string;
  success: boolean;
};

export enum EntryType {
  RALLY = "Rally",
  SUBSTITUTION = "Substitution",
  TIMEOUT = "Timeout",
  CHALLENGE = "Challenge",
}

/**
 * A stable identity and an ordering position, generated on the client before
 * the optimistic update runs. Identity never changes once assigned; position
 * is renumberable, which is why they are separate fields rather than one
 * order-bearing id.
 */
export type EntryIdentity = {
  id: string;
  seq: number;
};

export type RallyEntry = { type: EntryType.RALLY } & EntryIdentity & Rally;
export type SubstitutionEntry = {
  type: EntryType.SUBSTITUTION;
} & EntryIdentity &
  Substitution;
export type TimeoutEntry = { type: EntryType.TIMEOUT } & EntryIdentity &
  Timeout;
export type ChallengeEntry = { type: EntryType.CHALLENGE } & EntryIdentity &
  Challenge;

export type Entry =
  RallyEntry | SubstitutionEntry | TimeoutEntry | ChallengeEntry;

export const createRallyEntry = (rally: Rally & EntryIdentity): RallyEntry => ({
  type: EntryType.RALLY,
  ...rally,
});
export const createSubstitutionEntry = (
  sub: Substitution & EntryIdentity,
): SubstitutionEntry => ({
  type: EntryType.SUBSTITUTION,
  ...sub,
});
export const createTimeoutEntry = (
  timeout: Timeout & EntryIdentity,
): TimeoutEntry => ({
  type: EntryType.TIMEOUT,
  ...timeout,
});
export const createChallengeEntry = (
  challenge: Challenge & EntryIdentity,
): ChallengeEntry => ({
  type: EntryType.CHALLENGE,
  ...challenge,
});

export type Set = {
  win: boolean | null;
  lineups: {
    home: Lineup;
    away?: Lineup;
  };
  options: {
    serve: "home" | "away";
    time?: {
      start: string;
      end: string;
    };
  };
  entries: Entry[];
};

export type Game = {
  id: string;
  win: boolean | null;
  teamId: string;
  info: Match;
  teams: {
    home: Team;
    away: Team;
  };
  sets: Set[];
};

export type GameSummary = {
  id: string;
  win: boolean | null;
  info: Match;
  teams: {
    home: { id: string; name: string; sets: number; scores: number[] };
    away: { id: string; name: string; sets: number; scores: number[] };
  };
};

/* -------------------------------------------------------------- derivation */

/**
 * Entries are the only stored record of what happened in a set; statistics,
 * serve rights and the set phase are computed from them.
 *
 * These functions declare only the structure they read so that both the domain
 * `Entry` and the presentation `EntryView` satisfy them. Neither caller has to
 * adopt the other's shape, which is what keeps the rules shareable without
 * dragging a domain data shape into the frontend.
 */

type DerivableDetail = {
  score: number;
  type: MoveType;
  player?: { id?: string | null } | null;
};

export type DerivableRally = {
  win: boolean;
  home: DerivableDetail;
  away: DerivableDetail;
};

export type DerivableEntry = {
  type: EntryType;
  win?: boolean;
  home?: DerivableDetail;
  away?: DerivableDetail;
  team?: Side;
};

/** Per-set allowances the rules grant each team; remaining = limit - used. */
export const SET_ALLOWANCES = {
  substitution: 6,
  timeout: 2,
  challenge: 2,
} as const;

const isRally = (
  entry: DerivableEntry | undefined,
): entry is DerivableEntry & DerivableRally =>
  entry?.type === EntryType.RALLY &&
  entry.home !== undefined &&
  entry.away !== undefined &&
  entry.win !== undefined;

/** The last rally recorded before `entryIndex`, or null when there is none. */
export function getPreviousRally(
  entries: readonly DerivableEntry[] | undefined,
  entryIndex: number,
): DerivableRally | null {
  if (!entries || entryIndex <= 0) return null;

  for (let i = entryIndex - 1; i >= 0; i--) {
    const entry = entries[i];
    if (isRally(entry))
      return { win: entry.win, home: entry.home, away: entry.away };
  }

  return null;
}

/** Whether the home team serves the rally at `entryIndex`. */
export function deriveServingStatus(
  set:
    | {
        options: { serve: "home" | "away" };
        entries?: readonly DerivableEntry[];
      }
    | undefined,
  entryIndex: number,
): boolean {
  const previousRally = getPreviousRally(set?.entries, entryIndex);
  if (previousRally) return previousRally.win;
  return set ? set.options.serve === "home" : true;
}

/** The score needed to win a set, which is higher in the deciding set. */
export const setTargetPoints = (
  scoring: { setCount: number; decidingSetPoints: number },
  setIndex: number,
): number =>
  setIndex === scoring.setCount - 1 ? scoring.decidingSetPoints : 25;

export type SetPhase = { isSetInProgress: boolean; isSetPoint: boolean };

/** Whether the set is still being played, and whether it is at set point. */
export function deriveSetPhase(
  set: { entries?: readonly DerivableEntry[] } | undefined,
  entryIndex: number,
  targetPoints: number,
): SetPhase {
  const rally = getPreviousRally(set?.entries, entryIndex);

  // Nothing recorded yet: a set that exists is being played, and one that does
  // not would otherwise render a recording court that rejects every rally.
  if (!rally) return { isSetInProgress: !!set, isSetPoint: false };

  const { home, away } = rally;
  if (home.score < targetPoints - 1 && away.score < targetPoints - 1)
    return { isSetInProgress: true, isSetPoint: false };

  if (
    (home.score === targetPoints - 1 && home.score > away.score) ||
    (away.score === targetPoints - 1 && away.score > home.score)
  )
    return { isSetInProgress: true, isSetPoint: true };

  if (
    home.score >= targetPoints - 1 &&
    away.score >= targetPoints - 1 &&
    (home.score - away.score === 1 || away.score - home.score === 1)
  )
    return { isSetInProgress: true, isSetPoint: true };

  if (home.score >= targetPoints && home.score - away.score >= 2)
    return { isSetInProgress: false, isSetPoint: false };
  if (away.score >= targetPoints && away.score - home.score >= 2)
    return { isSetInProgress: false, isSetPoint: false };

  return { isSetInProgress: true, isSetPoint: false };
}

/**
 * Identity decides where a write lands, not position: an id already present
 * is replaced, anything else is inserted in `seq` order. Mirrors the
 * repository's upsert, so a rally written on the client ends up where the
 * server will put it -- and so a client whose entries are a subset of what it
 * is writing cannot leave a hole.
 */
export function upsertEntries<T extends EntryIdentity>(
  entries: readonly T[],
  incoming: readonly T[],
): T[] {
  const next = entries.slice();
  let inserted = false;

  // Later wins for a repeated id, as the server's ordered bulk write does.
  for (const entry of incoming) {
    const at = next.findIndex((e) => e.id === entry.id);
    if (at === -1) {
      next.push(entry);
      inserted = true;
    } else next[at] = entry;
  }
  if (inserted) next.sort((a, b) => a.seq - b.seq);

  return next;
}

/** Whether a set has been played out, judged on its own entries. */
export function isSetFinished(
  set: { entries?: readonly DerivableEntry[] } | undefined,
  scoring: { setCount: number; decidingSetPoints: number },
  setIndex: number,
): boolean {
  const { isSetInProgress } = deriveSetPhase(
    set,
    set?.entries?.length ?? 0,
    setTargetPoints(scoring, setIndex),
  );
  return !isSetInProgress;
}

/** How many sets each side has won, derived from each set's final rally. */
export function deriveSetsWon(
  sets: readonly { entries?: readonly DerivableEntry[] }[],
  scoring: { setCount: number; decidingSetPoints: number },
): { home: number; away: number } {
  let home = 0;
  let away = 0;

  sets.forEach((set, setIndex) => {
    if (!isSetFinished(set, scoring, setIndex)) return;
    const rally = getPreviousRally(set.entries, set.entries?.length ?? 0);
    if (!rally) return;

    if (rally.home.score > rally.away.score) home += 1;
    else away += 1;
  });

  return { home, away };
}

export type DerivedSetStats = {
  home: TeamStats;
  away: TeamStats;
  /** Keyed by player id; only players who recorded something appear. */
  players: Record<string, PlayerStats>;
};

/**
 * Totals for one set, computed from its entries.
 *
 * `substitution`, `timeout` and `challenge` are **used counts**. The remaining
 * allowance is `SET_ALLOWANCES[k] - used`, which is why they start at zero here
 * rather than at the limit.
 */
export function deriveSetStats(
  entries: readonly DerivableEntry[] | undefined,
  set: { options: { serve: "home" | "away" } },
): DerivedSetStats {
  const home = new TeamStatsClass();
  const away = new TeamStatsClass();
  const players: Record<string, PlayerStats> = {};

  // TeamStatsClass seeds the allowances with their limits; derived totals count
  // what was used, so start them at zero.
  home.substitution = 0;
  home.timeout = 0;
  home.challenge = 0;
  away.substitution = 0;
  away.timeout = 0;
  away.challenge = 0;

  let isHomeServing = set.options.serve === "home";

  for (const entry of entries ?? []) {
    if (isRally(entry)) {
      const { win } = entry;
      const homeStat = home[entry.home.type] as {
        success: number;
        error: number;
      };
      const awayStat = away[entry.away.type] as {
        success: number;
        error: number;
      };

      if (win) {
        homeStat.success += 1;
        awayStat.error += 1;
      } else {
        homeStat.error += 1;
        awayStat.success += 1;
      }

      const scorerId = entry.home.player?.id;
      if (scorerId && entry.home.type !== MoveType.UNFORCED) {
        const stats = (players[scorerId] ??= new PlayerStatsClass());
        const moveStat = stats[
          entry.home.type as Exclude<MoveType, MoveType.UNFORCED>
        ] as { success: number; error: number };
        if (win) moveStat.success += 1;
        else moveStat.error += 1;
      }

      // Serve rights pass to the winner; the home team rotates whenever it wins
      // a rally it did not serve.
      if (win && !isHomeServing) home.rotation += 1;
      isHomeServing = win;
      continue;
    }

    if (entry.type === EntryType.SUBSTITUTION) {
      if (entry.team === Side.AWAY) away.substitution += 1;
      else home.substitution += 1;
    } else if (entry.type === EntryType.TIMEOUT) {
      if (entry.team === Side.AWAY) away.timeout += 1;
      else home.timeout += 1;
    } else if (entry.type === EntryType.CHALLENGE) {
      if (entry.team === Side.AWAY) away.challenge += 1;
      else home.challenge += 1;
    }
  }

  return { home, away, players };
}
