import {
  getPreviousRally,
  recomputeLineups,
  mergeEntries,
} from "@/entities/game";
import type { GameView, PendingSubstitution } from "@/lib/features/game/types";

/**
 * The game with the substitution recorded and the lineup recomputed, or the
 * first substitution the lineup rules refuse and the score of the last rally
 * before it (0:0 if none).
 * That substitution is the written one or a later one the write breaks. The
 * same check the server makes, so a refused write is stopped before it is
 * queued.
 */
export const applySubstitution = (
  game: GameView,
  setIndex: number,
  entry: PendingSubstitution,
):
  | { game: GameView }
  | { invalid: { id: string; score: { home: number; away: number } } } => {
  const set = game.sets[setIndex]!;
  const entries = mergeEntries(set.entries, [entry]);
  const { lineups, invalid } = recomputeLineups(set.startingLineups, entries);
  if (invalid) {
    const previous = getPreviousRally(entries, entries.indexOf(invalid));
    const score = previous
      ? { home: previous.home.score, away: previous.away.score }
      : { home: 0, away: 0 };
    return { invalid: { id: invalid.id, score } };
  }

  const sets = game.sets.slice();
  sets[setIndex] = { ...set, entries, lineups };
  return { game: { ...game, sets } };
};
