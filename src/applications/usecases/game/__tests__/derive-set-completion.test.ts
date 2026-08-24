import { deriveSetCompletion } from "@/applications/usecases/game/derive-set-completion";
import {
  EntryType,
  MoveType,
  type Entry,
  type Game,
  type Set,
} from "@/entities/game";
import { describe, expect, it } from "@jest/globals";

const rally = (home: number, away: number, seq = 0): Entry => ({
  type: EntryType.RALLY,
  id: `entry-${home}-${away}`,
  seq,
  win: home > away,
  home: { score: home, type: MoveType.ATTACK, num: 1 },
  away: { score: away, type: MoveType.RECEPTION, num: 1 },
});

const set = (win: boolean | null, entries: Entry[] = []): Set => ({
  win,
  lineups: {
    home: { options: {}, starting: [], liberos: [], substitutes: [] } as never,
  },
  options: { serve: "home" },
  entries,
});

const game = (overrides: {
  win?: boolean | null;
  setCount?: number;
  sets: Set[];
}): Game => ({
  id: "game-1",
  win: overrides.win ?? null,
  teamId: "team-1",
  info: {
    scoring: { setCount: overrides.setCount ?? 3, decidingSetPoints: 15 },
  },
  teams: {
    home: { id: "home", name: "Home", players: [], staffs: [] },
    away: { id: "away", name: "Away", players: [], staffs: [] },
  },
  sets: overrides.sets,
});

describe("deriveSetCompletion", () => {
  it("returns null when the set is still in progress and win is already null", () => {
    const entries = [rally(1, 0)];
    const g = game({ sets: [set(null, entries)] });

    expect(deriveSetCompletion(g, 0, entries)).toBeNull();
  });

  it("resets a finished set back to in progress when an edit undoes it", () => {
    const entries = [rally(1, 0)];
    const g = game({ win: true, sets: [set(true, entries)] });

    expect(deriveSetCompletion(g, 0, entries)).toEqual({
      win: null,
      gameWin: null,
    });
  });

  it("derives the set winner once the set ends", () => {
    const entries = [rally(24, 10), rally(25, 10)];
    const g = game({ sets: [set(null, entries)] });

    expect(deriveSetCompletion(g, 0, entries)).toEqual({ win: true });
  });

  it("returns null when the derived set result already matches", () => {
    const entries = [rally(24, 10), rally(25, 10)];
    const g = game({ sets: [set(true, entries)] });

    expect(deriveSetCompletion(g, 0, entries)).toBeNull();
  });

  it("also writes the game's win once the match is decided", () => {
    const finishedEntries = [rally(24, 10), rally(25, 10)];
    const g = game({
      setCount: 3,
      sets: [
        set(true, finishedEntries),
        set(true, finishedEntries),
        set(null, finishedEntries),
      ],
    });

    expect(deriveSetCompletion(g, 2, finishedEntries)).toEqual({
      win: true,
      gameWin: true,
    });
  });

  it("does not write the game's win before the match is decided", () => {
    const finishedEntries = [rally(24, 10), rally(25, 10)];
    const g = game({
      setCount: 3,
      sets: [set(null, finishedEntries), set(null, [])],
    });

    expect(deriveSetCompletion(g, 0, finishedEntries)).toEqual({ win: true });
  });
});
