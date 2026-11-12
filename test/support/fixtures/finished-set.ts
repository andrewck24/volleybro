import type { GameView } from "@/lib/features/game/types";

export const lastRally = {
  type: "Rally",
  id: "e1",
  seq: 0,
  win: true,
  home: { score: 25, type: 2, num: 0 },
  away: { score: 20, type: 2, num: 0 },
};

export const gameWithSet = (win: boolean | null): GameView =>
  ({ id: "game-1", sets: [{ win, entries: [lastRally] }] }) as never;
