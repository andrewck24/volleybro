"use client";
import { Panel } from "@/components/custom/panel";
import { getEntryProgress } from "@/components/game/panel/entry-progress";
import { GameMoves } from "@/components/game/panel/moves";
import { EntryProgressBar } from "@/components/game/panel/progress-bar";
import { Substitutes } from "@/components/game/panel/substitutes";
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
  const { steps, activeStep, reachableSteps } = getEntryProgress(draft);

  const onStepChange = (index: number) => {
    if (!reachableSteps.includes(index)) return;
    if (index === 1) dispatch(gameActions.setPanel("home"));
    if (index === 2) dispatch(gameActions.setPanel("away"));
  };

  return (
    <Panel>
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
        <GameMoves gameId={gameId} className={className} />
      )}
    </Panel>
  );
};
