import { Position } from "@/entities/team";
import { getSetLineup } from "@/lib/features/game/helpers";
import type { GameView } from "@/lib/features/game/types";
import type { LineupView } from "@/lib/features/team/types";

const makeLineup = (marker: string): LineupView => ({
  options: { liberoReplaceMode: 0, liberoReplacePosition: Position.NONE },
  starting: [{ id: marker }],
  liberos: [],
  substitutes: [],
});

const makeGame = (
  sets: { lineups: { home: LineupView } }[],
  teamLineup?: LineupView,
): GameView =>
  ({
    sets,
    teams: { home: { lineup: teamLineup }, away: {} },
  }) as unknown as GameView;

describe("getSetLineup", () => {
  it("returns the set's own lineup when the set exists", () => {
    const game = makeGame([{ lineups: { home: makeLineup("set0") } }]);
    expect(getSetLineup(game, 0)).toEqual(makeLineup("set0"));
  });

  it("carries the previous set's lineup forward for a new subsequent set", () => {
    const game = makeGame([{ lineups: { home: makeLineup("set0") } }]);
    // Adding set 1: teams.home.lineup was deleted after set 0, so it must fall
    // back to set 0's lineup.
    expect(getSetLineup(game, 1)).toEqual(makeLineup("set0"));
  });

  it("falls back to the team default lineup for the first set", () => {
    const game = makeGame([], makeLineup("team"));
    expect(getSetLineup(game, 0)).toEqual(makeLineup("team"));
  });

  it("returns undefined for the first set when no team lineup exists", () => {
    const game = makeGame([]);
    expect(getSetLineup(game, 0)).toBeUndefined();
  });

  it("returns undefined when game is undefined", () => {
    expect(getSetLineup(undefined, 0)).toBeUndefined();
  });
});
