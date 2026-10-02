import type { GameView } from "@/lib/features/game/types";

/** The last rally of a set as the server stores it, with the entry `type`. */
export const lastRally = {
  type: "Rally",
  id: "e1",
  seq: 0,
  win: true,
  home: { score: 25, type: 2, num: 0 },
  away: { score: 20, type: 2, num: 0 },
};

/** The same rally as the write queue holds it: the client sends no `type`. */
export const { type: _type, ...pendingRally } = lastRally;

/** A one-set game whose recorded result is `win`, `null` while it is unconfirmed. */
export const gameWithSet = (win: boolean | null): GameView =>
  ({ id: "game-1", sets: [{ win, entries: [lastRally] }] }) as never;
