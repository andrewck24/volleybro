"use client";
import { Panel } from "@/components/custom/panel";
import { Options } from "@/components/game/set-options/panel/options";
import { Substitutes } from "@/components/game/set-options/panel/substitutes";
import { PlayerInfo } from "@/components/team/lineup/panel/player-info";
import { Positions } from "@/components/team/lineup/panel/positions";
import { useGame } from "@/hooks/use-data";
import { LineupOptionMode } from "@/lib/features/team/types";
import { useAppSelector } from "@/lib/redux/hooks";

export const SetOptionsPanel = ({ gameId }: { gameId: string }) => {
  const { game } = useGame(gameId);
  const { optionMode } = useAppSelector((state) => state.lineup.status);

  return (
    <Panel>
      {optionMode === LineupOptionMode.PLAYERINFO ? (
        <PlayerInfo players={game?.teams.home.players ?? []} />
      ) : optionMode === LineupOptionMode.SUBSTITUTES ? (
        <Substitutes gameId={gameId} />
      ) : optionMode === LineupOptionMode.POSITIONS ? (
        <Positions />
      ) : (
        <Options gameId={gameId} />
      )}
    </Panel>
  );
};
