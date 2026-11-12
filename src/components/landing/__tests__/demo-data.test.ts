import {
  SENT_RALLY,
  SET_RALLIES,
  diffsAt,
} from "@/components/landing/demo-data";
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
    expect(SENT_RALLY.homeWon).toBe(
      scoringMoves[SENT_RALLY.homeMoveIndex]!.win,
    );
    expect(
      scoringMoves[SENT_RALLY.homeMoveIndex]!.outcome.includes(
        SENT_RALLY.awayMoveIndex,
      ),
    ).toBe(true);
    expect(SET_RALLIES).toContain(SENT_RALLY);
  });
});
