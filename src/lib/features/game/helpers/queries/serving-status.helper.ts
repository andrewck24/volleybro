import type { Set } from "@/entities/game";
import { getPreviousRally } from "@/lib/features/game/helpers";

export const getServingStatus = (set: Set, entryIndex: number): boolean => {
  const previousRally = getPreviousRally(set?.entries, entryIndex);
  return previousRally
    ? previousRally.win
    : set
      ? set.options.serve === "home"
      : true;
};
