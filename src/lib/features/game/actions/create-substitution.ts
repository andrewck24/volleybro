import { apiClient } from "@/lib/api/api-client";
import type {
  EntryView,
  GameView,
  SubstitutionView,
} from "@/lib/features/game/types";

export const createSubstitution = async (
  params: { gameId: string; setIndex: number; entryIndex: number },
  substitution: SubstitutionView,
  game: GameView,
) => {
  const { gameId, setIndex, entryIndex } = params;
  // A thrown request error propagates as-is, letting the optimistic SWR
  // mutate roll back to the previous game instead of caching `undefined`
  // (which would crash every `game!` reader).
  const entries = await apiClient<EntryView[]>(
    `/api/games/${gameId}/sets/substitutions?si=${setIndex}&ei=${entryIndex}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(substitution),
    },
  );
  // setIndex references the active set that was just persisted; guaranteed present
  game.sets[setIndex]!.entries = entries;
  return game;
};
