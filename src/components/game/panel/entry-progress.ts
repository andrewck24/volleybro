import { MoveType } from "@/entities/game";
import type { ReduxEntryDraft } from "@/lib/features/game/types";

export type ProgressStep = {
  key: string;
  caption: string;
};

const STEPS: ProgressStep[] = [
  { key: "player", caption: "選擇球員或對方失誤" },
  { key: "home", caption: "我方得失分紀錄" },
  { key: "away", caption: "對方得失分紀錄" },
];

const AWAY_ERROR_STEP: ProgressStep = {
  key: "away-error",
  caption: "對方失誤，可直接送出",
};

export type EntryProgress = {
  steps: ProgressStep[];
  activeStep: number;
  reachableSteps: number[];
  submittable: boolean;
};

/**
 * Derives the three-step (player -> home -> away) progress bar state from the
 * current entry draft. A step is only reachable once every predecessor step is
 * complete. An away-team error collapses the flow to a single submittable step.
 */
export function getEntryProgress(draft: ReduxEntryDraft): EntryProgress {
  const playerId = draft.home.player?.id;
  const playerComplete = typeof playerId === "string" && playerId.length > 0;
  // Guard against the falsy-but-valid num === 0 case (a real ScoringMove num).
  const homeComplete = typeof draft.home.num === "number";
  const awayComplete = typeof draft.away.num === "number";
  const isAwayError = awayComplete && draft.away.type === MoveType.UNFORCED;

  if (isAwayError) {
    return {
      steps: [AWAY_ERROR_STEP],
      activeStep: 0,
      reachableSteps: [0],
      submittable: true,
    };
  }

  const activeStep = !playerComplete ? 0 : !homeComplete ? 1 : 2;
  const reachableSteps = [0];
  if (playerComplete) reachableSteps.push(1);
  if (playerComplete && homeComplete) reachableSteps.push(2);

  return {
    steps: STEPS,
    activeStep,
    reachableSteps,
    submittable: awayComplete,
  };
}
