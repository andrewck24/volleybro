import { EntryType, MoveType } from "@/entities/game";

/** A one-set game with a single rally, for tests that open a game's edit dialogs. */
export const rally = {
  id: "e1",
  seq: 0,
  type: EntryType.RALLY,
  win: true,
  home: {
    score: 1,
    type: MoveType.SERVING,
    num: 0,
    player: { id: "p1", zone: 1 },
  },
  away: { score: 0, type: MoveType.SERVING, num: 1 },
};
export const game = {
  id: "game-1",
  info: { scoring: { setCount: 3, decidingSetPoints: 15 } },
  teams: { home: { players: [{ id: "p1", name: "選手一", number: 4 }] } },
  sets: [
    {
      options: { serve: "home" },
      lineups: {
        home: {
          options: { liberoReplaceMode: 0, liberoReplacePosition: "" },
          starting: [{ id: "p1", position: "OH" }],
          liberos: [],
          substitutes: [],
        },
      },
      entries: [rally],
    },
  ],
};
