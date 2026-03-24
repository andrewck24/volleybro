import {
  type Player,
  PlayerRole,
  PlayerStatus,
  Position,
} from "@/entities/player";
import type { Team } from "@/entities/team";
import {
  type Record,
  type Set,
  type Match,
  type Team as RecordTeam,
  MatchPhase,
  MatchDivision,
  MatchCategory,
  MoveType,
  EntryType,
} from "@/entities/record";
import type { User } from "@/entities/user";
import type { Profile } from "@/entities/profile";

export function createPlayer(overrides?: Partial<Player>): Player {
  return {
    _id: "player-1",
    name: "Test Player",
    number: 1,
    position: Position.OH,
    status: PlayerStatus.JOINED,
    teamId: "team-1",
    userId: "user-1",
    role: PlayerRole.MEMBER,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

export function createTeam(overrides?: Partial<Team>): Team {
  return {
    _id: "team-1",
    name: "Test Team",
    lineups: [],
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

export function createUser(overrides?: Partial<User>): User {
  return {
    _id: "user-1",
    name: "Test User",
    email: "test@example.com",
    emailVerified: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

export function createProfile(overrides?: Partial<Profile>): Profile {
  return {
    _id: "profile-1",
    userId: "user-1",
    activeTeamId: "team-1",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function createDefaultMatch(): Match {
  return {
    name: "Test Match",
    number: 1,
    phase: MatchPhase.NONE,
    division: MatchDivision.NONE,
    category: MatchCategory.NONE,
    scoring: { setCount: 3, decidingSetPoints: 15 },
  };
}

function createDefaultRecordTeam(
  overrides?: Partial<RecordTeam>,
): RecordTeam {
  return {
    _id: "record-team-1",
    name: "Record Team",
    players: [],
    staffs: [],
    stats: [],
    ...overrides,
  };
}

function createDefaultSet(): Set {
  return {
    win: true,
    lineups: {
      home: {
        options: { liberoReplaceMode: 0, liberoReplacePosition: Position.NONE },
        starting: [],
        liberos: [],
        substitutes: [],
      },
    },
    options: { serve: "home" },
    entries: [
      {
        type: EntryType.RALLY,
        win: true,
        home: { score: 1, type: MoveType.ATTACK, num: 1 },
        away: { score: 0, type: MoveType.RECEPTION, num: 1 },
      },
    ],
  };
}

export function createRecord(overrides?: Partial<Record>): Record {
  return {
    _id: "record-1",
    win: true,
    team_id: "team-1",
    info: createDefaultMatch(),
    teams: {
      home: createDefaultRecordTeam({ _id: "team-1", name: "Home Team" }),
      away: createDefaultRecordTeam({ _id: "team-2", name: "Away Team" }),
    },
    sets: [createDefaultSet()],
    ...overrides,
  };
}
