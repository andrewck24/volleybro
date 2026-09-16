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
  type InvitedPlayer,
  PlayerRole,
  PlayerStatus,
  Position,
  type TeamMember,
  type UnlinkedPlayer,
} from "@/entities/player";
import type { Profile } from "@/entities/profile";
import type { Team } from "@/entities/team";
import type { User } from "@/entities/user";

const playerBase = {
  id: "player-1",
  name: "Test Player",
  number: 1,
  position: Position.OH,
  teamId: "team-1",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

export function createPlayer(overrides?: Partial<TeamMember>): TeamMember {
  return {
    ...playerBase,
    status: PlayerStatus.JOINED,
    userId: "user-1",
    role: PlayerRole.MEMBER,
    ...overrides,
  };
}

export function createUnlinkedPlayer(
  overrides?: Partial<UnlinkedPlayer>,
): UnlinkedPlayer {
  return { ...playerBase, status: PlayerStatus.NONE, ...overrides };
}

type InvitedOverrides = Partial<
  Omit<InvitedPlayer, "status" | "userId" | "email">
> & { userId?: string; email?: string };

/**
 * An invitee. Exactly one link is written: the userId when the invitee's
 * account is known, the email otherwise — the cast is what expresses that to
 * the compiler, which cannot follow the choice through the spread.
 */
export function createInvitedPlayer(
  overrides: InvitedOverrides = {},
): InvitedPlayer {
  const { userId, email, ...rest } = overrides;
  return {
    ...playerBase,
    status: PlayerStatus.INVITED,
    role: PlayerRole.MEMBER,
    ...rest,
    ...(userId ? { userId } : { email: email ?? "invited@example.com" }),
  } as InvitedPlayer;
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
        id: "entry-1",
        seq: 0,
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
