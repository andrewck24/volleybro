import {
  SET_RALLIES,
  foldRallies,
  setAt,
} from "@/components/landing/demo-data";
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

  it("is one finished 25:21 set that the score folds out of the wins", () => {
    const folded = foldRallies(SET_RALLIES);

    expect(folded.at(-1)).toMatchObject({ homeScore: 25, awayScore: 21 });
    expect(folded.slice(0, 3).map((r) => [r.homeScore, r.awayScore])).toEqual([
      [1, 0],
      [1, 1],
      [2, 1],
    ]);
  });

  it("lists a partial set newest rally first", () => {
    expect(setAt(3)).toEqual({
      rallies: 3,
      entries: [SET_RALLIES[2]!.win, SET_RALLIES[1]!.win, SET_RALLIES[0]!.win],
    });
  });
});
