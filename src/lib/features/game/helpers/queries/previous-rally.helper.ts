import { EntryType } from "@/entities/game";
import type { EntryView, RallyView } from "@/lib/features/game/types";

export const getPreviousRally = (
  entries: EntryView[],
  entryIndex: number,
): RallyView | null => {
  if (!entries || entryIndex <= 0) return null;

  for (let i = entryIndex - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.type === EntryType.RALLY) {
      return {
        win: entry.win,
        home: entry.home,
        away: entry.away,
      };
    }
  }

  return null;
};
