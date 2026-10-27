import { recomputeLineups, upsertEntries } from "@/entities/game";
import type { GameView, PendingEntryContent } from "@/lib/features/game/types";

/**
 * The game with the substitution recorded and the lineup recomputed, or null
 * when the lineup rules refuse it. The same check the server makes, so a
 * refused write is stopped before it is queued.
 */
export const applySubstitution = (
  game: GameView,
  setIndex: number,
  entry: Extract<PendingEntryContent, { team: unknown }>,
): GameView | null => {
  const set = game.sets[setIndex]!;
  const entries = upsertEntries(set.entries, [entry]);
  const { lineups, invalid } = recomputeLineups(set.startingLineups, entries);
  if (invalid) return null;

  const sets = game.sets.slice();
  sets[setIndex] = { ...set, entries, lineups };
  return { ...game, sets };
};
