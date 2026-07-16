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
  stats: PlayerStats[];
};

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
  stats: TeamStats[];
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

export type RallyEntry = { type: EntryType.RALLY } & Rally;
export type SubstitutionEntry = { type: EntryType.SUBSTITUTION } & Substitution;
export type TimeoutEntry = { type: EntryType.TIMEOUT } & Timeout;
export type ChallengeEntry = { type: EntryType.CHALLENGE } & Challenge;

export type Entry =
  RallyEntry | SubstitutionEntry | TimeoutEntry | ChallengeEntry;

export const createRallyEntry = (rally: Rally): RallyEntry => ({
  type: EntryType.RALLY,
  ...rally,
});
export const createSubstitutionEntry = (
  sub: Substitution,
): SubstitutionEntry => ({
  type: EntryType.SUBSTITUTION,
  ...sub,
});
export const createTimeoutEntry = (timeout: Timeout): TimeoutEntry => ({
  type: EntryType.TIMEOUT,
  ...timeout,
});
export const createChallengeEntry = (challenge: Challenge): ChallengeEntry => ({
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
  win: boolean;
  info: Match;
  teams: {
    home: { id: string; name: string; sets: number; scores: number[] };
    away: { id: string; name: string; sets: number; scores: number[] };
  };
};
