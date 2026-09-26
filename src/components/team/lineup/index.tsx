"use client";
import { LoadingCourt } from "@/components/custom/court";
import { ServerErrorState } from "@/components/custom/error/server-error-state";
import LineupCourt from "@/components/team/lineup/court";
import { LineupPanel } from "@/components/team/lineup/panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { useTeam, useTeamPlayers } from "@/hooks/use-data";
import { apiClient } from "@/lib/api/api-client";
import { showErrorToast } from "@/lib/api/error-toast";
import { useReplacePosition } from "@/lib/features/team/hooks/use-replace-position";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import type { LineupView } from "@/lib/features/team/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useEffect } from "react";
import { RiSaveLine } from "react-icons/ri";

const Lineup = ({ teamId }: { teamId: string }) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { team, error: teamError, mutate } = useTeam(teamId);
  const {
    players,
    error: playersError,
    mutate: mutatePlayers,
  } = useTeamPlayers(teamId);

  const handleSave = async (lineups: LineupView[]) => {
    try {
      const data = await apiClient<LineupView[]>(
        `/api/teams/${teamId}/lineups`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lineups),
        },
      );
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
  const { hasPairedReplacePosition } = useReplacePosition();

  useEffect(() => {
    if (team && team.lineups) dispatch(lineupActions.initialize(team.lineups));
  }, [team, dispatch]);

  if (teamError || playersError)
    return (
      <ServerErrorState
        onRetry={() => {
          mutate();
          mutatePlayers();
        }}
      />
    );

  if (!team || !players || !lineups.length) {
    return <LineupSkeleton />;
  }

  return (
    <>
      <LineupCourt players={players} />
      <LineupPanel
        players={players}
        hasPairedSwitchPosition={hasPairedReplacePosition}
      />
      {!status.optionMode && (
        <div className="flex w-full flex-col px-4 pt-2">
          <Button
            size="lg"
            onClick={() => handleSave(lineups)}
            disabled={!status.edited || !hasPairedReplacePosition}
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
