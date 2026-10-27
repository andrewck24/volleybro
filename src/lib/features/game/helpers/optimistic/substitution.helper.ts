import {
  getPreviousRally,
  recomputeLineups,
  upsertEntries,
} from "@/entities/game";
import type { GameView, PendingSubstitution } from "@/lib/features/game/types";

/**
 * The game with the substitution recorded and the lineup recomputed, or the
 * first substitution the lineup rules refuse and the points played before it.
 * That substitution is the written one or a later one the write breaks. The
 * same check the server makes, so a refused write is stopped before it is
 * queued.
 */
export const applySubstitution = (
  game: GameView,
  setIndex: number,
  entry: PendingSubstitution,
): { game: GameView } | { invalid: { id: string; points: number } } => {
  const set = game.sets[setIndex]!;
  const entries = upsertEntries(set.entries, [entry]);
  const { lineups, invalid } = recomputeLineups(set.startingLineups, entries);
  if (invalid) {
    const previous = getPreviousRally(entries, entries.indexOf(invalid));
    const points = previous ? previous.home.score + previous.away.score : 0;
    return { invalid: { id: invalid.id, points } };
  }

  const sets = game.sets.slice();
  sets[setIndex] = { ...set, entries, lineups };
  return { game: { ...game, sets } };
};
