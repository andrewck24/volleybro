import { type Entry, type RallyEntry, EntryType } from "@/entities/game";

export const getPreviousRally = (
  entries: Entry[],
  entryIndex: number,
): RallyEntry | null => {
  if (!entries || entryIndex <= 0) return null;

  for (let i = entryIndex - 1; i >= 0; i--) {
    if (entries[i].type === EntryType.RALLY) {
      return entries[i] as RallyEntry;
    }
  }

  return null;
};
