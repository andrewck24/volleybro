import type { GameView } from "@/lib/features/game/types";
import type { LineupView } from "@/lib/features/team/types";

export const getSetLineup = (
  game: GameView | undefined,
  setIndex: number,
): LineupView | undefined =>
  game?.sets[setIndex]?.startingLineups.home ??
  game?.sets[setIndex - 1]?.startingLineups.home ??
  game?.teams.home.lineup;
