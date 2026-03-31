"use client";
import { Options } from "@/components/record/set-options/panel/options";
import { Substitutes } from "@/components/record/set-options/panel/substitutes";
import { PlayerInfo } from "@/components/team/lineup/panel/player-info";
import { Positions } from "@/components/team/lineup/panel/positions";
import { Panel } from "@/components/custom/panel";
import { useRecord } from "@/hooks/use-data";
import { LineupOptionMode } from "@/lib/features/team/types";
import { useAppSelector } from "@/lib/redux/hooks";

export const SetOptionsPanel = ({ recordId }: { recordId: string }) => {
  const { record } = useRecord(recordId);
  const { optionMode } = useAppSelector((state) => state.lineup.status);

  return (
    <Panel>
      {optionMode === LineupOptionMode.PLAYERINFO ? (
        <PlayerInfo players={record?.teams.home.players ?? []} />
      ) : optionMode === LineupOptionMode.SUBSTITUTES ? (
        <Substitutes recordId={recordId} />
      ) : optionMode === LineupOptionMode.POSITIONS ? (
        <Positions />
      ) : (
        <Options recordId={recordId} />
      )}
    </Panel>
  );
};
