import type { Game, Substitution } from "@/entities/game";

export const createSubstitution = async (
  params: { gameId: string; setIndex: number; entryIndex: number },
  substitution: Substitution,
  game: Game,
) => {
  const { gameId, setIndex, entryIndex } = params;
  try {
    const res = await fetch(
      `/api/games/${gameId}/sets/substitutions?si=${setIndex}&ei=${entryIndex}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(substitution),
      },
    );
    if (!res.ok) throw new Error("Network response was not ok");
    const entries = await res.json();
    game.sets[setIndex].entries = entries;
    return game;
  } catch (error) {
    console.error("[CREATE Substitution]", error);
  }
};
