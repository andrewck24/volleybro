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

const OPPONENT_ERROR_STEPS: ProgressStep[] = [
  { key: "player", caption: "選擇球員或對方失誤" },
  { key: "away", caption: "對方得失分紀錄" },
];

export type EntryProgress = {
  steps: ProgressStep[];
  activeStep: number;
  reachableSteps: number[];
  submittable: boolean;
};

function isOpponentErrorEntry(entry: ReduxEntryDraft): boolean {
  return (
    typeof entry.home.num === "number" && entry.home.type === MoveType.UNFORCED
  );
}

export function getEntryProgress(draft: ReduxEntryDraft): EntryProgress {
  const playerId = draft.home.player?.id;
  const playerComplete = typeof playerId === "string" && playerId.length > 0;
  const homeComplete = typeof draft.home.num === "number";
  const awayComplete = typeof draft.away.num === "number";
  const isOpponentError = isOpponentErrorEntry(draft);

  if (isOpponentError) {
    return {
      steps: OPPONENT_ERROR_STEPS,
      activeStep: 1,
      reachableSteps: [0, 1],
      submittable: awayComplete,
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
    submittable: playerComplete && homeComplete && awayComplete,
  };
}
