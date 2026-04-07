"use client";
import { Panel } from "@/components/custom/panel";
import { GameMoves } from "@/components/game/panel/moves";
import { Substitutes } from "@/components/game/panel/substitutes";
import type { ReduxGameState } from "@/lib/features/game/types";
import { useAppSelector } from "@/lib/redux/hooks";

export const GamePanel = ({
  gameId,
  mode,
  className,
}: {
  gameId: string;
  mode: ReduxGameState["mode"];
  className?: string;
}) => {
  const { status } = useAppSelector((state) => state.game[mode]);

  return (
    <Panel>
      {status.panel === "substitutes" ? (
        <Substitutes gameId={gameId} mode={mode} className={className} />
      ) : (
        <GameMoves gameId={gameId} className={className} />
      )}
    </Panel>
  );
};
