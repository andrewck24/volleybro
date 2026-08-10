import {
  EntryType,
  type Game,
  type Team as GameTeam,
  type Match,
  MatchCategory,
  MatchDivision,
  MatchPhase,
  MoveType,
  type Set,
} from "@/entities/game";
import {
  type Player,
  PlayerRole,
  PlayerStatus,
  Position,
} from "@/entities/player";
import type { Profile } from "@/entities/profile";
import type { Team } from "@/entities/team";
import type { User } from "@/entities/user";

export function createPlayer(overrides?: Partial<Player>): Player {
  return {
    id: "player-1",
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
    id: "team-1",
    name: "Test Team",
    lineups: [],
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

export function createUser(overrides?: Partial<User>): User {
  return {
    id: "user-1",
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
    id: "profile-1",
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

function createDefaultGameTeam(overrides?: Partial<GameTeam>): GameTeam {
  return {
    id: "game-team-1",
    name: "Game Team",
    players: [],
    staffs: [],
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

export function createGame(overrides?: Partial<Game>): Game {
  return {
    id: "game-1",
    win: true,
    teamId: "team-1",
    info: createDefaultMatch(),
    teams: {
      home: createDefaultGameTeam({ id: "team-1", name: "Home Team" }),
      away: createDefaultGameTeam({ id: "team-2", name: "Away Team" }),
    },
    sets: [createDefaultSet()],
    ...overrides,
  };
}
