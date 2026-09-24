import { getPreviousRally } from "@/entities/game";
import type { EntryView } from "@/lib/features/game/types";

export const getPreviousScores = (
  entries: EntryView[] | undefined,
  entryIndex: number,
): { home: number; away: number } => {
  const previousRally = getPreviousRally(entries, entryIndex);
  return previousRally
    ? { home: previousRally.home.score, away: previousRally.away.score }
    : { home: 0, away: 0 };
};
