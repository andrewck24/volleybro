import { apiClient } from "@/lib/api/api-client";
import type { EntryView, GameView, RallyView } from "@/lib/features/game/types";

export const updateRally = async (
  params: { gameId: string; setIndex: number; entryIndex: number },
  entryDraft: RallyView,
  game: GameView,
) => {
  const { gameId, setIndex, entryIndex } = params;
  try {
    const entries = await apiClient<EntryView[]>(
      `/api/games/${gameId}/sets/rallies?si=${setIndex}&ei=${entryIndex}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entryDraft),
      },
    );
    // setIndex references the active set that was just persisted; guaranteed present
    game.sets[setIndex]!.entries = entries;
    return game;
  } catch (error) {
    // Re-throw so the optimistic SWR mutate rolls back to the previous game
    // instead of caching `undefined` (which would crash every `game!` reader).
    console.error("[UPDATE Rally]", error);
    throw error;
  }
};
