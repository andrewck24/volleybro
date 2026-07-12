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

// Opponent error: no player is picked, so the player/home steps collapse into a
// single selection step, leaving [select opponent error -> confirm outcome].
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

/**
 * Derives the progress bar state from the current entry draft. The rally type
 * is fixed by OUR move: an UNFORCED home move is an opponent error, which is a
 * two-step flow [select opponent error -> confirm outcome] with the outcome
 * auto-filled (each error maps to a single outcome). Every other point is the
 * normal three-step flow (player -> home -> away). A step is only reachable
 * once every predecessor is complete.
 *
 * Keying the discriminator on the HOME move (not away) is deliberate: our own
 * losing serve/set (num 1/8) auto-fill an UNFORCED *away* move, so checking
 * away.type would wrongly collapse those normal three-step points to one step.
 */
export function getEntryProgress(draft: ReduxEntryDraft): EntryProgress {
  const playerId = draft.home.player?.id;
  const playerComplete = typeof playerId === "string" && playerId.length > 0;
  // Guard against the falsy-but-valid num === 0 case (a real ScoringMove num).
  const homeComplete = typeof draft.home.num === "number";
  const awayComplete = typeof draft.away.num === "number";
  const isOpponentError = homeComplete && draft.home.type === MoveType.UNFORCED;

  if (isOpponentError) {
    // The outcome auto-fills on selection, so the confirm step is always the
    // active (and reachable) one, and the entry is immediately submittable.
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
    // Invariant: setEntryDraftHomeMove sets win, home.type/num and a default
    // away.type/num atomically, so awayComplete implies the earlier steps.
    submittable: awayComplete,
  };
}
