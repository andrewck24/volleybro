"use client";
import { LineupOptions } from "@/components/team/lineup/panel/options";
import { PlayerInfo } from "@/components/team/lineup/panel/player-info";
import { Positions } from "@/components/team/lineup/panel/positions";
import { Substitutes } from "@/components/team/lineup/panel/substitutes";
import { Panel } from "@/components/ui/panel";
import type { Player } from "@/entities/player";
import { LineupOptionMode } from "@/lib/features/team/types";
import { useAppSelector } from "@/lib/redux/hooks";

interface LineupPanelProps {
  players: Player[];
  hasPairedSwitchPosition: boolean;
}

export const LineupPanel = ({
  players,
  hasPairedSwitchPosition,
}: LineupPanelProps) => {
  const { lineups, status } = useAppSelector((state) => state.lineup);
  const { optionMode } = status;
  const { starting, liberos, substitutes } = lineups[status.lineupIndex];
  const listedIds = new Set([
    ...starting.map((player) => player._id),
    ...liberos.map((player) => player._id),
    ...substitutes.map((player) => player._id),
  ]);
  const others = players
    .filter((player) => !listedIds.has(player._id))
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

  return (
    <Panel className="px-4 py-2">
      {optionMode === LineupOptionMode.PLAYERINFO ? (
        <PlayerInfo players={players} />
      ) : optionMode === LineupOptionMode.SUBSTITUTES ? (
        <Substitutes players={players} others={others} />
      ) : optionMode === LineupOptionMode.POSITIONS ? (
        <Positions />
      ) : (
        <LineupOptions
          players={players}
          others={others}
          hasPairedSwitchPosition={hasPairedSwitchPosition}
        />
      )}
    </Panel>
  );
};
