import {
  FOLDED_RALLIES,
  SEED_COUNT,
  SET_RALLIES,
  diffsAt,
} from "@/components/landing/demo-data";
import { entriesOf } from "@/components/landing/demo-entries";
import { MoveType } from "@/entities/game";
import { getTeamsStats } from "@/lib/features/game/helpers";
import type { GameView } from "@/lib/features/game/types";
import { scoringMoves } from "@/lib/scoring-moves";

describe("landing demo set", () => {
  it("tells the same story as the app's scoring moves", () => {
    for (const [i, r] of SET_RALLIES.entries()) {
      const home = scoringMoves[r.homeMoveIndex]!;
      expect({ i, win: r.homeWon }).toEqual({ i, win: home.win });
      expect({ i, away: home.outcome.includes(r.awayMoveIndex) }).toEqual({
        i,
        away: true,
      });
    }
  });

  it("runs the point differential from 0, oldest rally first", () => {
    expect(diffsAt(4)).toEqual([0, 1, 0, 1, 2]);
  });

  it("preserves the score change shown during the walkthrough", () => {
    const openingEntries = entriesOf("walkthrough", SEED_COUNT);
    const entriesAfterSend = entriesOf("walkthrough", SEED_COUNT + 1);
    const openingScore = FOLDED_RALLIES[SEED_COUNT - 1]!;
    const attackBar = (entries: typeof openingEntries) => {
      const stats = getTeamsStats(
        {
          sets: [{ options: { serve: "home" }, entries }],
        } as unknown as Pick<GameView, "sets">,
        0,
      );
      return {
        left: stats.home[MoveType.ATTACK].success,
        right: stats.away[MoveType.ATTACK].success,
      };
    };

    expect([openingScore.homeScore, openingScore.awayScore]).toEqual([7, 5]);
    expect(attackBar(openingEntries)).toEqual({ left: 2, right: 2 });
    expect(attackBar(entriesAfterSend)).toEqual({ left: 3, right: 2 });
  });
});
