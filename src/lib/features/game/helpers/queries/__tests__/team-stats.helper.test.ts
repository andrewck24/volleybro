import { EntryType, MoveType } from "@/entities/game";
import { getTeamsStats } from "@/lib/features/game/helpers";
import type { GameView } from "@/lib/features/game/types";

describe("getTeamsStats", () => {
  const rally = (
    win: boolean,
    home: number,
    away: number,
    type: MoveType = MoveType.ATTACK,
  ) => ({
    type: EntryType.RALLY,
    win,
    home: { score: home, type, num: 1 },
    away: { score: away, type: MoveType.DEFENSE, num: 1 },
  });

  // A game whose team.stats arrays were never seeded, matching the state
  // create-set now leaves behind.
  const mockGame = {
    sets: [
      {
        options: { serve: "home" },
        entries: [rally(true, 1, 0, MoveType.ATTACK)],
      },
      {
        options: { serve: "home" },
        entries: [
          rally(true, 1, 0, MoveType.BLOCKING),
          rally(true, 2, 0, MoveType.SERVING),
        ],
      },
    ],
  } as unknown as Pick<GameView, "sets">;

  it("derives one set's totals when the stored counters were never written", () => {
    const stats = getTeamsStats(mockGame, 0);

    expect(stats.home[MoveType.ATTACK].success).toBe(1);
    expect(stats.away[MoveType.DEFENSE].error).toBe(1);
  });

  it("sums every set's totals for the whole-match view", () => {
    const stats = getTeamsStats(mockGame, -1);

    expect(stats.home[MoveType.ATTACK].success).toBe(1);
    expect(stats.home[MoveType.BLOCKING].success).toBe(1);
    expect(stats.home[MoveType.SERVING].success).toBe(1);
    expect(stats.away[MoveType.DEFENSE].error).toBe(3);
  });

  it("returns zeroed totals when there are no sets yet", () => {
    const stats = getTeamsStats({ sets: [] }, -1);

    expect(stats.home[MoveType.ATTACK]).toEqual({ success: 0, error: 0 });
    expect(stats.away[MoveType.ATTACK]).toEqual({ success: 0, error: 0 });
  });
});
