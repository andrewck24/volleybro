"use client";
import { Options } from "@/components/record/set-options/panels/options";
import { Substitutes } from "@/components/record/set-options/panels/substitutes";
import { PlayerInfo } from "@/components/team/lineup/panels/player-info";
import { Positions } from "@/components/team/lineup/panels/positions";
import { Panels } from "@/components/ui/panels";
import { useRecord } from "@/hooks/use-data";
import { LineupOptionMode } from "@/lib/features/team/types";
import { useAppSelector } from "@/lib/redux/hooks";

export const SetOptionsPanels = ({ recordId }: { recordId: string }) => {
  const { record } = useRecord(recordId);
  const { optionMode } = useAppSelector((state) => state.lineup.status);

  return (
    <Panels>
      {optionMode === LineupOptionMode.PLAYERINFO ? (
        <PlayerInfo members={record.teams.home.players} />
      ) : optionMode === LineupOptionMode.SUBSTITUTES ? (
        <Substitutes recordId={recordId} />
      ) : optionMode === LineupOptionMode.POSITIONS ? (
        <Positions />
      ) : (
        <Options recordId={recordId} />
      )}
    </Panels>
  );
};
