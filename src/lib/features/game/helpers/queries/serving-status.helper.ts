import { getPreviousRally } from "@/lib/features/game/helpers";
import type { SetView } from "@/lib/features/game/types";

export const getServingStatus = (
  set: SetView | undefined,
  entryIndex: number,
): boolean => {
  const previousRally = getPreviousRally(set?.entries, entryIndex);
  return previousRally
    ? previousRally.win
    : set
      ? set.options.serve === "home"
      : true;
};
