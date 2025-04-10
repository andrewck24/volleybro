import { getPreviousRally } from "@/lib/features/record/helpers";
import type { Record } from "@/entities/record";

export const matchPhaseHelper = (
  record: Record,
  setIndex: number,
  entryIndex: number
): {
  inProgress: boolean;
  isSetPoint: boolean;
} => {
  // To calculate the point to win the set
  const isDecidingSet = setIndex === record.info.scoring.setCount - 1;
  const point = isDecidingSet ? record.info.scoring.decidingSetPoints : 25;
  const rally = getPreviousRally(record.sets[setIndex]?.entries, entryIndex);

  // In the first set, though there is no entries recorded yet,
  // the game is `inProgress` if `entries` of the first set has been created
  if (!rally) {
    if (record?.sets[0]?.entries)
      return { inProgress: true, isSetPoint: false };
    return { inProgress: false, isSetPoint: false };
  }

  const { home, away } = rally;
  // Game is in progress if both scores are less than point - 1
  if (home.score < point - 1 && away.score < point - 1)
    return { inProgress: true, isSetPoint: false };

  // Set point if one side's score is point - 1 and leading by at least 1 point
  if (
    (home.score === point - 1 && home.score > away.score) ||
    (away.score === point - 1 && away.score > home.score)
  )
    return { inProgress: true, isSetPoint: true };

  // Set point if both scores are >= point - 1 and one side is leading by 1 point
  if (
    home.score >= point - 1 &&
    away.score >= point - 1 &&
    (home.score - away.score === 1 || away.score - home.score === 1)
  )
    return { inProgress: true, isSetPoint: true };

  // Game over if one side's score is >= point and leading by at least 2 points
  if (home.score >= point && home.score - away.score >= 2)
    return { inProgress: false, isSetPoint: false };
  if (away.score >= point && away.score - home.score >= 2)
    return { inProgress: false, isSetPoint: false };

  // Otherwise, the game is still in progress
  return { inProgress: true, isSetPoint: false };
};
