"use client";
import ConfirmInvitation from "@/components/team/confirmation";
import TeamHero from "@/components/team/hero";
import TeamInfo from "@/components/team/info";
import TeamPlayers from "@/components/team/players";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTeam, useTeamPlayers } from "@/hooks/use-data";
import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";

const Team = ({ teamId, tab }: { teamId: string; tab: string }) => {
  const defaultTab = tab || "players";
  const { mutate: mutateTeam } = useTeam(teamId);
  const { mutate: mutatePlayers } = useTeamPlayers(teamId);
  const mutate = async () => {
    mutateTeam();
    mutatePlayers();
  };
  usePullToRefresh(mutate);

  return (
    <div className="flex flex-col">
      <ConfirmInvitation teamId={teamId} />
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