"use client";
import { Panel } from "@/components/custom/panel";
import { getEntryProgress } from "@/components/game/panel/entry-progress";
import { GameMoves } from "@/components/game/panel/moves";
import { EntryProgressBar } from "@/components/game/panel/progress-bar";
import { Substitutes } from "@/components/game/panel/substitutes";
import { useStepSwipe } from "@/components/game/panel/use-step-swipe";
import { gameActions } from "@/lib/features/game/game-slice";
import type { ReduxGameState } from "@/lib/features/game/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";

export const GamePanel = ({
  gameId,
  mode,
  className,
}: {
  gameId: string;
  mode: ReduxGameState["mode"];
  className?: string;
}) => {
  const dispatch = useAppDispatch();
  const { status, entryDraft: draft } = useAppSelector(
    (state) => state.game[mode],
  );
  const { steps, reachableSteps } = getEntryProgress(draft);

  // Single source of truth: the highlighted step and the shown moves body both
  // follow status.panel (home -> OursMoves, away -> OppoMoves) so they can never
  // disagree. Step 0 (player) has no moves panel -- selection lives on the
  // always-visible court -- so it is derived from the draft not yet having a
  // player. The opponent-error flow is two steps [select -> outcome]: its
  // outcome step is the away panel, so map panel "away" to the last step.
  const isOpponentError = steps.length === 2;
  const playerComplete = Boolean(draft.home.player?.id);
  const lastStep = steps.length - 1;
  const activeStep = isOpponentError
    ? status.panel === "away"
      ? 1
      : 0
    : !playerComplete
      ? 0
      : status.panel === "away"
        ? 2
        : 1;

  const onStepChange = (index: number) => {
    if (!reachableSteps.includes(index)) return;
    dispatch(gameActions.setPanel(index === lastStep ? "away" : "home"));
  };

  const swipe = useStepSwipe({ activeStep, reachableSteps, onStepChange });

  return (
    // min-h-0 lets the moves body below scroll within the panel instead of
    // overflowing past it onto the drawer peek.
    <Panel className="min-h-0 gap-0 overflow-hidden rounded-lg pb-2">
      {status.panel !== "substitutes" && (
        <EntryProgressBar
          steps={steps}
          activeStep={activeStep}
          reachableSteps={reachableSteps}
          onStepChange={onStepChange}
        />
      )}
      {status.panel === "substitutes" ? (
        <Substitutes gameId={gameId} mode={mode} className={className} />
      ) : (
        <GameMoves className={className} swipe={swipe} />
      )}
    </Panel>
  );
};
