import type { GameView, RallyView } from "@/lib/features/game/types";

export const createRally = async (
  params: { gameId: string; setIndex: number; entryIndex: number },
  entryDraft: RallyView,
  game: GameView,
) => {
  const { gameId, setIndex, entryIndex } = params;
  try {
    const res = await fetch(
      `/api/games/${gameId}/sets/rallies?si=${setIndex}&ei=${entryIndex}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entryDraft),
      },
    );
    if (!res.ok) throw new Error("Network response was not ok");
    const entries = await res.json();
    game.sets[setIndex].entries = entries;
    return game;
  } catch (error) {
    console.error("[CREAT Rally]", error);
  }
};
