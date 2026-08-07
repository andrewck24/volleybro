import { getPreviousRally } from "@/lib/features/game/helpers";
import type { GameView } from "@/lib/features/game/types";

export const getSetPhase = (
  game: GameView,
  setIndex: number,
  entryIndex: number,
): {
  isSetInProgress: boolean;
  isSetPoint: boolean;
} => {
  // To calculate the point to win the set
  const isDecidingSet = setIndex === game.info.scoring.setCount - 1;
  const point = isDecidingSet ? game.info.scoring.decidingSetPoints : 25;
  const set = game.sets[setIndex];
  const rally = getPreviousRally(set?.entries, entryIndex);

  // Nothing recorded yet: a set that exists is being played, and one that does
  // not would otherwise render a recording court that rejects every rally.
  if (!rally) return { isSetInProgress: !!set, isSetPoint: false };

  const { home, away } = rally;
  // The set is in progress while both scores are below the last point
  if (home.score < point - 1 && away.score < point - 1)
    return { isSetInProgress: true, isSetPoint: false };

  // Set point if one side's score is point - 1 and leading by at least 1 point
  if (
    (home.score === point - 1 && home.score > away.score) ||
    (away.score === point - 1 && away.score > home.score)
  )
    return { isSetInProgress: true, isSetPoint: true };

  // Set point if both scores are >= point - 1 and one side is leading by 1 point
  if (
    home.score >= point - 1 &&
    away.score >= point - 1 &&
    (home.score - away.score === 1 || away.score - home.score === 1)
  )
    return { isSetInProgress: true, isSetPoint: true };

  // The set is over once one side reaches the point total and leads by 2
  if (home.score >= point && home.score - away.score >= 2)
    return { isSetInProgress: false, isSetPoint: false };
  if (away.score >= point && away.score - home.score >= 2)
    return { isSetInProgress: false, isSetPoint: false };

  // Otherwise the set is still being played
  return { isSetInProgress: true, isSetPoint: false };
};
