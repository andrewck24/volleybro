import { MoveType } from "@/entities/game";
import { Position } from "@/entities/player";
import { createGame } from "./entities";
import { createRecordedRally } from "./entries";

/** A one-set game with a single rally, for tests that open a game's edit dialogs. */
export const rally = createRecordedRally({
  id: "e1",
  win: true,
  home: {
    score: 1,
    type: MoveType.SERVING,
    num: 0,
    player: { id: "p1", zone: 1 },
  },
  away: { score: 0, type: MoveType.SERVING, num: 1 },
});

const base = createGame();
const [firstSet] = base.sets;

const lineups = {
  home: {
    ...firstSet!.lineups.home,
    starting: [{ id: "p1", position: Position.OH }],
  },
};

export const game = createGame({
  teams: {
    ...base.teams,
    home: {
      ...base.teams.home,
      players: [{ id: "p1", name: "選手一", number: 4 }],
    },
  },
  sets: [
    {
      ...firstSet!,
      startingLineups: lineups,
      lineups,
      entries: [rally],
    },
  ],
});
