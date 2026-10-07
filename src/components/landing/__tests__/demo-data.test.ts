import { SET_RALLIES, diffsAt } from "@/components/landing/demo-data";
import { scoringMoves } from "@/lib/scoring-moves";

// demo-data stays import-free of the app, so it restates what scoringMoves
// says about each rally; the hero list, stats and walkthrough read it as truth.
describe("landing demo set", () => {
  it("tells the same story as the app's scoring moves", () => {
    for (const [i, r] of SET_RALLIES.entries()) {
      const home = scoringMoves[r.home]!;
      expect({ i, win: r.win }).toEqual({ i, win: home.win });
      expect({ i, away: home.outcome.includes(r.away) }).toEqual({
        i,
        away: true,
      });
    }
  });

  it("runs the point differential from 0, oldest rally first", () => {
    // the set opens won, lost, won, won
    expect(diffsAt(4)).toEqual([0, 1, 0, 1, 2]);
  });
});
