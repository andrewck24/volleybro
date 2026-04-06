import type { Entry } from "@/entities/game";
import { getPreviousRally } from "@/lib/features/game/helpers";

export const getPreviousScores = (
  entries: Entry[],
  entryIndex: number,
): { home: number; away: number } => {
  const previousRally = getPreviousRally(entries, entryIndex);
  return previousRally
    ? { home: previousRally.home.score, away: previousRally.away.score }
    : { home: 0, away: 0 };
};
