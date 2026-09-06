import { ValidationError } from "@/entities/errors";
import {
  EntryType,
  MoveType,
  type Player,
  PlayerStatsClass,
  SET_ALLOWANCES,
  Side,
  TeamStatsClass,
  deriveServingStatus,
  deriveSetPhase,
  deriveSetStats,
  deriveSetsWon,
  getPreviousRally,
  setTargetPoints,
  validateLineupPlayers,
} from "@/entities/game";
import { Position, type Lineup } from "@/entities/team";

type PlayerStatsMoveType = Exclude<MoveType, MoveType.UNFORCED>;

const player = (id: string | null): Player => ({
  id: id as string,
  name: "P",
  number: 1,
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

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty object", {}],
    ["non-array starting", { ...lineup(), starting: "nope" }],
    ["non-array liberos", { ...lineup(), liberos: 42 }],
    ["non-array substitutes", { ...lineup(), substitutes: null }],
  ])("throws ValidationError for a malformed lineup (%s)", (_label, bad) => {
    expect(() =>
      validateLineupPlayers(bad as unknown as Lineup, roster),
    ).toThrow(ValidationError);
  });

  it('never lets the literal "null" reference a null roster id', () => {
    const rosterWithNullId = [player("a"), player(null)];
    expect(() =>
      validateLineupPlayers(
        lineup({ starting: [{ id: "a" }, { id: "null" }] }),
        rosterWithNullId,
      ),
    ).toThrow(ValidationError);
  });
});

describe("set derivation", () => {
  const rally = (
    win: boolean,
    homeScore: number,
    awayScore: number,
    scorerId?: string,
    type: MoveType = MoveType.ATTACK,
  ) => ({
    type: EntryType.RALLY,
    win,
    home: {
      score: homeScore,
      type,
      ...(scorerId ? { player: { id: scorerId } } : {}),
    },
    away: { score: awayScore, type: MoveType.DEFENSE },
  });

  const set = { options: { serve: "home" as const } };

  describe("getPreviousRally", () => {
    it("skips non-rally entries when looking back", () => {
      const entries = [
        rally(true, 1, 0),
        { type: EntryType.SUBSTITUTION, team: Side.HOME },
      ];
      expect(getPreviousRally(entries, 2)?.home.score).toBe(1);
    });

    it("returns null before the first entry", () => {
      expect(getPreviousRally([rally(true, 1, 0)], 0)).toBeNull();
    });
  });

  describe("deriveServingStatus", () => {
    it("falls back to the set's serve option with no rally yet", () => {
      expect(deriveServingStatus({ ...set, entries: [] }, 0)).toBe(true);
      expect(
        deriveServingStatus({ options: { serve: "away" }, entries: [] }, 0),
      ).toBe(false);
    });

    it("gives serve to whoever won the previous rally", () => {
      const entries = [rally(false, 0, 1)];
      expect(deriveServingStatus({ ...set, entries }, 1)).toBe(false);
    });
  });

  describe("setTargetPoints", () => {
    const scoring = { setCount: 5, decidingSetPoints: 15 };

    it("uses 25 for a non-deciding set", () => {
      expect(setTargetPoints(scoring, 0)).toBe(25);
    });

    it("uses the deciding set points for the last set", () => {
      expect(setTargetPoints(scoring, 4)).toBe(15);
    });
  });

  describe("deriveSetPhase", () => {
    it("treats an existing set with no entries as in progress", () => {
      expect(deriveSetPhase({ entries: [] }, 0, 25).isSetInProgress).toBe(true);
    });

    it("treats a set that was never created as not in progress", () => {
      expect(deriveSetPhase(undefined, 0, 25).isSetInProgress).toBe(false);
    });

    it("reports set point at 24 with a lead", () => {
      expect(deriveSetPhase({ entries: [rally(true, 24, 20)] }, 1, 25)).toEqual(
        {
          isSetInProgress: true,
          isSetPoint: true,
        },
      );
    });

    it("ends the set at 25 with a two point lead", () => {
      expect(deriveSetPhase({ entries: [rally(true, 25, 20)] }, 1, 25)).toEqual(
        {
          isSetInProgress: false,
          isSetPoint: false,
        },
      );
    });

    it("keeps a deuce going", () => {
      expect(deriveSetPhase({ entries: [rally(true, 25, 24)] }, 1, 25)).toEqual(
        {
          isSetInProgress: true,
          isSetPoint: true,
        },
      );
    });

    it("uses the deciding set points for the last set", () => {
      expect(
        deriveSetPhase({ entries: [rally(true, 15, 10)] }, 1, 15)
          .isSetInProgress,
      ).toBe(false);
    });
  });

  describe("deriveSetsWon", () => {
    const scoring = { setCount: 5, decidingSetPoints: 15 };

    it("counts a finished set for whoever reached target with a two point lead", () => {
      const sets = [
        { entries: [rally(true, 25, 20)] },
        { entries: [rally(false, 10, 25)] },
      ];
      expect(deriveSetsWon(sets, scoring)).toEqual({ home: 1, away: 1 });
    });

    it("does not count a set still in progress", () => {
      const sets = [{ entries: [rally(true, 24, 20)] }];
      expect(deriveSetsWon(sets, scoring)).toEqual({ home: 0, away: 0 });
    });

    it("does not count a set with no entries yet", () => {
      const sets = [{ entries: [] }];
      expect(deriveSetsWon(sets, scoring)).toEqual({ home: 0, away: 0 });
    });

    it("uses the deciding set points for the last set", () => {
      const sets = [
        { entries: [] },
        { entries: [] },
        { entries: [] },
        { entries: [] },
        { entries: [rally(true, 15, 10)] },
      ];
      expect(deriveSetsWon(sets, scoring)).toEqual({ home: 1, away: 0 });
    });
  });

  describe("deriveSetStats", () => {
    it("counts team and player outcomes from the entries alone", () => {
      const stats = deriveSetStats(
        [rally(true, 1, 0, "p1"), rally(false, 1, 1, "p1")],
        set,
      );

      expect(stats.home[MoveType.ATTACK]).toEqual({ success: 1, error: 1 });
      expect(stats.away[MoveType.DEFENSE]).toEqual({ success: 1, error: 1 });
      expect(stats.players["p1"]![MoveType.ATTACK]).toEqual({
        success: 1,
        error: 1,
      });
    });

    it("leaves out a rally that names no player", () => {
      const stats = deriveSetStats([rally(true, 1, 0)], set);
      expect(Object.keys(stats.players)).toHaveLength(0);
      expect(stats.home[MoveType.ATTACK].success).toBe(1);
    });

    it("rotates only when the home team wins a rally it did not serve", () => {
      // home serves first, wins (no rotation), loses serve, wins it back (rotation)
      const stats = deriveSetStats(
        [rally(true, 1, 0), rally(false, 1, 1), rally(true, 2, 1)],
        set,
      );
      expect(stats.home.rotation).toBe(1);
    });

    it("reports allowances as used counts starting from zero", () => {
      const stats = deriveSetStats(
        [
          { type: EntryType.SUBSTITUTION, team: Side.HOME },
          { type: EntryType.SUBSTITUTION, team: Side.AWAY },
          { type: EntryType.TIMEOUT, team: Side.HOME },
        ],
        set,
      );

      expect(stats.home.substitution).toBe(1);
      expect(stats.away.substitution).toBe(1);
      expect(stats.home.timeout).toBe(1);
      expect(stats.away.timeout).toBe(0);
      expect(SET_ALLOWANCES.substitution - stats.home.substitution).toBe(5);
    });
  });
});
