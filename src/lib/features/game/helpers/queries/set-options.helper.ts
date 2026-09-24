import type { GameView, SetOptionsFormValues } from "@/lib/features/game/types";

/**
 * Resolves the values that seed a set's options form.
 *
 * - Existing set: the options saved with it.
 * - New set: serve alternates from the previous set, and the first set starts
 *   with the opponent serving. The start time is `now`.
 */
export const getSetOptions = (
  game: GameView | undefined,
  setIndex: number,
  now: string,
): SetOptionsFormValues => {
  const saved = game?.sets[setIndex]?.options;
  if (saved) {
    return { serve: saved.serve, time: saved.time ?? { start: now, end: "" } };
  }
  const previousServe = game?.sets[setIndex - 1]?.options?.serve;
  return {
    serve: setIndex === 0 || previousServe === "home" ? "away" : "home",
    time: { start: now, end: "" },
  };
};
