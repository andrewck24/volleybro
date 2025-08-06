"use client";
import { LineupOptions } from "@/components/team/lineup/panel/options";
import { PlayerInfo } from "@/components/team/lineup/panel/player-info";
import { Positions } from "@/components/team/lineup/panel/positions";
import { Substitutes } from "@/components/team/lineup/panel/substitutes";
import { Panel } from "@/components/ui/panel";
import { LineupOptionMode } from "@/lib/features/team/types";
import { useAppSelector } from "@/lib/redux/hooks";

export const LineupPanel = ({ members, hasPairedSwitchPosition }) => {
  const { lineups, status } = useAppSelector((state) => state.lineup);
  const { optionMode } = status;
  const { starting, liberos, substitutes } = lineups[status.lineupIndex];
  const listedIds = new Set([
    ...starting.map((player) => player._id),
    ...liberos.map((player) => player._id),
    ...substitutes.map((player) => player._id),
  ]);
  const others = members
    .filter((member) => !listedIds.has(member._id))
    .sort((a, b) => a.number - b.number);

  return (
    <Panel className="px-4 py-2">
      {optionMode === LineupOptionMode.PLAYERINFO ? (
        <PlayerInfo members={members} />
      ) : optionMode === LineupOptionMode.SUBSTITUTES ? (
        <Substitutes members={members} others={others} />
      ) : optionMode === LineupOptionMode.POSITIONS ? (
        <Positions />
      ) : (
        <LineupOptions
          members={members}
          others={others}
          hasPairedSwitchPosition={hasPairedSwitchPosition}
        />
      )}
    </Panel>
  );
};
