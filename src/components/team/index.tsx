"use client";
import { PullRefreshIndicator } from "@/components/layout/pull-refresh-indicator";
import TeamHero from "@/components/team/hero";
import TeamInfo from "@/components/team/info";
import TeamPlayers from "@/components/team/players";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useTeam, useTeamPlayers } from "@/hooks/use-data";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { showErrorToast } from "@/lib/api/error-toast";
import { useCallback, useRef } from "react";

const Team = ({ teamId, tab }: { teamId: string; tab: string }) => {
  const { toast } = useToast();
  const defaultTab = tab || "players";
  const { mutate: mutateTeam } = useTeam(teamId);
  const { mutate: mutatePlayers } = useTeamPlayers(teamId);
  const mutate = useCallback(
    () => Promise.all([mutateTeam(), mutatePlayers()]),
    [mutateTeam, mutatePlayers],
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const refreshState = usePullToRefresh(containerRef, mutate, {
    onError: (err) => showErrorToast(err, toast),
  });

  return (
    <div ref={containerRef} className="flex flex-col">
      <PullRefreshIndicator state={refreshState} />
      <TeamHero teamId={teamId} />
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="players">成員</TabsTrigger>
          <TabsTrigger value="about">關於</TabsTrigger>
        </TabsList>
        <TabsContent value="players">
          <TeamPlayers teamId={teamId} />
        </TabsContent>
        <TabsContent value="about">
          <TeamInfo teamId={teamId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Team;
