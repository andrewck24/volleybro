"use client";
import { LoadingCourt } from "@/components/custom/court";
import LineupCourt from "@/components/team/lineup/court";
import { LineupPanel } from "@/components/team/lineup/panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import type { Lineup } from "@/entities/team";
import { useTeam, useTeamPlayers } from "@/hooks/use-data";
import { apiClient } from "@/lib/api/api-client";
import { showErrorToast } from "@/lib/api/error-toast";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useEffect } from "react";
import { RiSaveLine } from "react-icons/ri";

const Lineup = ({ teamId }: { teamId: string }) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { team, mutate } = useTeam(teamId);
  const { players } = useTeamPlayers(teamId);

  const handleSave = async (lineups: Lineup[]) => {
    try {
      const data = await apiClient<Lineup[]>(`/api/teams/${team!.id}/lineups`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lineups),
      });
      mutate({ ...team!, lineups: data }, false);
      return toast({
        title: "儲存成功",
        description: "已成功儲存陣容設定。",
      });
    } catch (error) {
      showErrorToast(error, toast);
    }
  };

  const { lineups, status } = useAppSelector((state) => state.lineup);
  const liberoReplaceMode =
    lineups[status.lineupIndex]?.options.liberoReplaceMode;
  const liberoReplacePosition =
    lineups[status.lineupIndex]?.options.liberoReplacePosition;
  const hasPairedSwitchPosition =
    liberoReplaceMode === 0 ||
    (liberoReplacePosition === "OP"
      ? lineups[status.lineupIndex]?.starting.some(
          (player) => player.id && player.position === "OP",
        )
      : lineups[status.lineupIndex]?.starting.some((player, index) => {
          const oppositeIndex = index >= 3 ? index - 3 : index + 3;
          return (
            player.id &&
            player.position === liberoReplacePosition &&
            lineups[status.lineupIndex].starting[oppositeIndex].id &&
            lineups[status.lineupIndex].starting[oppositeIndex].position ===
              liberoReplacePosition
          );
        }));

  useEffect(() => {
    if (team && team.lineups) dispatch(lineupActions.initialize(team.lineups));
  }, [team, dispatch]);

  if (!team || !players || !lineups.length) {
    return <LineupSkeleton />;
  }

  return (
    <>
      <LineupCourt players={players} />
      <LineupPanel
        players={players}
        hasPairedSwitchPosition={hasPairedSwitchPosition}
      />
      {!status.optionMode && (
        <div className="flex w-full flex-col px-4 pt-2">
          <Button
            size="lg"
            onClick={() => handleSave(lineups)}
            disabled={!status.edited || !hasPairedSwitchPosition}
          >
            <RiSaveLine />
            儲存陣容
          </Button>
        </div>
      )}
    </>
  );
};

export function LineupSkeleton() {
  return (
    <>
      <LoadingCourt />
      {/* mirrors LineupPanel: Panel slot with px-4 py-2 */}
      <div className="flex w-full flex-1 flex-col items-center justify-start gap-2 overflow-x-hidden bg-card px-4 py-2">
        <Skeleton className="my-0.5 h-5 w-32" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
      {/* mirrors save button row */}
      <div className="flex w-full flex-col px-4 pt-2">
        <Skeleton className="h-11 w-full" /> {/* size="lg" button */}
      </div>
    </>
  );
}

export default Lineup;
