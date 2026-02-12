"use client";
import Lineup from "@/components/team/lineup";
import { useToast } from "@/components/ui/use-toast";
import { useTeam, useTeamPlayers } from "@/hooks/use-data";
import { use } from "react";

const LineupPage = (props: { params: Promise<{ teamId: string }> }) => {
  const params = use(props.params);
  const { toast } = useToast();
  const { teamId } = params;
  const { team, mutate } = useTeam(teamId);
  const { players } = useTeamPlayers(teamId);

  const handleSave = async (lineups) => {
    try {
      const response = await fetch(`/api/teams/${team._id}/lineups`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(lineups),
      });
      const data = await response.json();
      mutate({ ...team, lineups: data }, false);
      return toast({
        title: "儲存成功",
        description: "已成功儲存陣容設定。",
      });
    } catch (error) {
      console.log(error);
    }
  };

  return <Lineup team={team} members={players} handleSave={handleSave} />;
};

export default LineupPage;
