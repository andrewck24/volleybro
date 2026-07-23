import type { GameView } from "@/lib/features/game/types";
import type { LineupView } from "@/lib/features/team/types";

/**
 * Resolves the lineup used to seed a set's options form.
 *
 * - Existing set: that set's own home lineup.
 * - New set (index >= 1): carry the previous set's home lineup forward.
 * - First set: fall back to the team's default lineup (still present until the
 *   first set is created, then intentionally deleted as redundant).
 */
export const getSetLineup = (
  game: GameView | undefined,
  setIndex: number,
): LineupView | undefined =>
  game?.sets[setIndex]?.lineups?.home ??
  game?.sets[setIndex - 1]?.lineups?.home ??
  game?.teams.home.lineup;
