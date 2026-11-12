import { upsertEntries, type InvalidEntryWrite } from "@/entities/game";
import type { GameView, PendingSubstitution } from "@/lib/features/game/types";

export const applySubstitution = (
  game: GameView,
  setIndex: number,
  entry: PendingSubstitution,
): { game: GameView } | { invalid: InvalidEntryWrite } => {
  const set = game.sets[setIndex]!;
  const result = upsertEntries(set, [entry]);
  if ("invalid" in result) return { invalid: result.invalid };

  const sets = game.sets.slice();
  sets[setIndex] = result.set;
  return { game: { ...game, sets } };
};
