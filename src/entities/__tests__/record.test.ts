import { MoveType, PlayerStatsClass, TeamStatsClass } from "@/entities/record";

type PlayerStatsMoveType = Exclude<MoveType, MoveType.UNFORCED>;

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
