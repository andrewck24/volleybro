import { getPreviousRally } from "@/lib/features/game/helpers";
import type { GameView } from "@/lib/features/game/types";

export const gamePhaseHelper = (
  game: GameView,
  setIndex: number,
  entryIndex: number,
): {
  inProgress: boolean;
  isSetPoint: boolean;
} => {
  // To calculate the point to win the set
  const isDecidingSet = setIndex === game.info.scoring.setCount - 1;
  const point = isDecidingSet ? game.info.scoring.decidingSetPoints : 25;
  const set = game.sets[setIndex];
  const rally = getPreviousRally(set?.entries, entryIndex);

  // No rally to judge yet, so the set's own existence is the answer: a set that
  // has been created is being played even with an empty `entries`, and one that
  // has not must not report `inProgress` — the caller would render the
  // recording court over a set the server has no row for, and every rally
  // submitted from it is rejected.
  if (!rally) return { inProgress: !!set, isSetPoint: false };

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
