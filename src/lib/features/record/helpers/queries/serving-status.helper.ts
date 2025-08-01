import { getPreviousRally } from "@/lib/features/record/helpers";
import type { Set } from "@/entities/record";

export const getServingStatus = (set: Set, entryIndex: number): boolean => {
  const previousRally = getPreviousRally(set?.entries, entryIndex);
  return previousRally
    ? previousRally.win
    : set
    ? set.options.serve === "home"
    : true;
};
