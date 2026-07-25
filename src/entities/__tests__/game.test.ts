import { ValidationError } from "@/entities/errors";
import {
  MoveType,
  type Player,
  PlayerStatsClass,
  TeamStatsClass,
  validateLineupPlayers,
} from "@/entities/game";
import { Position, type Lineup } from "@/entities/team";

type PlayerStatsMoveType = Exclude<MoveType, MoveType.UNFORCED>;

const player = (id: string | null): Player => ({
  id: id as string,
  name: "P",
  number: 1,
  stats: [],
});

const lineup = (overrides: Partial<Lineup> = {}): Lineup => ({
  options: { liberoReplaceMode: 0, liberoReplacePosition: Position.NONE },
  starting: [],
  liberos: [],
  substitutes: [],
  ...overrides,
});

describe("PlayerStatsClass", () => {
  let stats: PlayerStatsClass;

  beforeEach(() => {
    stats = new PlayerStatsClass();
  });

  it("should initialize with zero values", () => {
    const moveTypes: PlayerStatsMoveType[] = [
      MoveType.SERVING,
      MoveType.BLOCKING,
      MoveType.ATTACK,
      MoveType.RECEPTION,
      MoveType.DEFENSE,
      MoveType.SETTING,
    ];

    moveTypes.forEach((moveType) => {
      expect(stats[moveType]).toEqual({
        success: 0,
        error: 0,
      });
    });
  });
});

describe("TeamStatsClass", () => {
  let stats: TeamStatsClass;

  beforeEach(() => {
    stats = new TeamStatsClass();
  });

  it("should initialize with zero stats values", () => {
    const moveTypes = [
      MoveType.SERVING,
      MoveType.BLOCKING,
      MoveType.ATTACK,
      MoveType.RECEPTION,
      MoveType.DEFENSE,
      MoveType.SETTING,
      MoveType.UNFORCED,
    ];

    moveTypes.forEach((moveType) => {
      expect(stats[moveType]).toEqual({
        success: 0,
        error: 0,
      });
    });
  });

  it("should initialize game stats with correct values", () => {
    expect(stats.rotation).toBe(0);
    expect(stats.timeout).toBe(2);
    expect(stats.substitution).toBe(6);
    expect(stats.challenge).toBe(2);
  });
});

describe("validateLineupPlayers", () => {
  const roster = [player("a"), player("b"), player("c")];

  it("passes when every referenced id is on the roster", () => {
    expect(() =>
      validateLineupPlayers(
        lineup({
          starting: [{ id: "a" }, { id: "b" }],
          liberos: [{ id: "c" }],
        }),
        roster,
      ),
    ).not.toThrow();
  });

  it("throws ValidationError when a referenced id is not on the roster", () => {
    expect(() =>
      validateLineupPlayers(
        lineup({ starting: [{ id: "a" }, { id: "ghost" }] }),
        roster,
      ),
    ).toThrow(ValidationError);
  });

  it("validates nested sub ids", () => {
    expect(() =>
      validateLineupPlayers(
        lineup({
          starting: [{ id: "a", sub: { id: "ghost", entryIndex: {} } }],
        }),
        roster,
      ),
    ).toThrow(ValidationError);
  });

  it("skips null references (empty slots / unassigned subs)", () => {
    expect(() =>
      validateLineupPlayers(
        lineup({
          starting: [{ id: "a", sub: { id: null, entryIndex: {} } }],
          substitutes: [{ id: null }],
        }),
        roster,
      ),
    ).not.toThrow();
  });

  it("never treats a null-id guest on the roster as a valid target", () => {
    const rosterWithGuest = [player("a"), player(null)];
    expect(() =>
      validateLineupPlayers(
        lineup({ starting: [{ id: "a" }, { id: "null" }] }),
        rosterWithGuest,
      ),
    ).toThrow(ValidationError);
  });
});
