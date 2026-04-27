"use client";
import { GameHistory } from "@/components/home/game-history";
import { PullRefreshIndicator } from "@/components/layout/pull-refresh-indicator";
import { useToast } from "@/components/ui/use-toast";
import { useActiveTeamId, useGameSummaries } from "@/hooks/use-data";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { showErrorToast } from "@/lib/api/error-toast";
import { useCallback, useRef } from "react";

const Home = () => {
  const { toast } = useToast();
  const { teamId, isLoading, mutate: mutateTeamId } = useActiveTeamId();
  const { gameSummaries, mutate: mutateSummaries } = useGameSummaries(teamId);

  const mutate = useCallback(
    () => Promise.all([mutateTeamId(), ...(teamId ? [mutateSummaries()] : [])]),
    [teamId, mutateTeamId, mutateSummaries],
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const refreshState = usePullToRefresh(containerRef, mutate, {
    onError: (err) => {
      if (gameSummaries.length) showErrorToast(err, toast);
    },
  });

  return (
    <div ref={containerRef}>
      <PullRefreshIndicator state={refreshState} />
      <GameHistory
        teamId={teamId}
        isLoading={isLoading}
        refreshError={refreshState.refreshError}
      />
    </div>
  );
};

export default Home;
