import { upsertEntries } from "@/entities/game";
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
  const result = upsertEntries(set, [entry]);
  if ("invalid" in result) return result;

  const sets = game.sets.slice();
  sets[setIndex] = result.set;
  return { game: { ...game, sets } };
};
