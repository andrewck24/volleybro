import { type Entry, type Rally, EntryType } from "@/entities/record";

export const getPreviousRally = (
  entries: Entry[],
  entryIndex: number
): Rally | null => {
  if (!entries || entryIndex <= 0) return null;

  for (let i = entryIndex - 1; i >= 0; i--) {
    if (entries[i].type === EntryType.RALLY) {
      return entries[i].data as Rally;
    }
  }

  return null;
};
