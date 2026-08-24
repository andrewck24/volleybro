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
  try {
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
  } catch (error) {
    // Re-throw so the optimistic SWR mutate rolls back to the previous game
    // instead of caching `undefined` (which would crash every `game!` reader).
    console.error("[CREATE Substitution]", error);
    throw error;
  }
};
