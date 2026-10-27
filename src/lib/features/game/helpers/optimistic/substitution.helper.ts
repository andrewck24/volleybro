import {
  EntryType,
  recomputeLineups,
  type EntryIdentity,
} from "@/entities/game";
import type { GameView, SubstitutionView } from "@/lib/features/game/types";

export const createSubstitutionHelper = (
  params: { gameId: string; setIndex: number; entryIndex: number },
  substitution: SubstitutionView & EntryIdentity,
  game: GameView,
) => {
  const { setIndex, entryIndex } = params;
  // setIndex is the active set being recorded; guaranteed in bounds
  const set = game.sets[setIndex]!;
  const entry = { type: EntryType.SUBSTITUTION, ...substitution } as const;

  const entries = set.entries.slice();
  entries[entryIndex] = entry as (typeof entries)[number];

  const { lineups, invalid } = recomputeLineups(set.startingLineups, entries);
  if (invalid) return game;

  set.lineups = lineups;
  set.entries = entries;

  return game;
};
