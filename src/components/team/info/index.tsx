"use client";
import LoadingCard from "@/components/custom/loading/card";
import { Link } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { canManageTeam } from "@/entities/player";
import { useTeam, useTeamPlayers, useUser } from "@/hooks/use-data";
import { RiEditBoxLine, RiGroupLine, RiInformationLine } from "react-icons/ri";

const TeamInfo = ({ teamId }: { teamId: string }) => {
  const { team, isLoading: isTeamLoading } = useTeam(teamId);
  const { players, isLoading: isPlayersLoading } = useTeamPlayers(teamId);
  const { user, isLoading: isUserLoading } = useUser();

  if (isTeamLoading || isPlayersLoading || isUserLoading)
    return <LoadingCard />;

  const contents = [
    { key: "簡稱", value: team.nickname, icon: <RiInformationLine /> },
    { key: "人數", value: players.length, icon: <RiGroupLine /> },
  ];
  const currentUserPlayer = players?.find((p) => p.userId === user?._id);
  const isAdmin = canManageTeam(currentUserPlayer);

  return (
    <Card>
      <CardHeader>
        <CardTitle>隊伍資訊</CardTitle>
      </CardHeader>
      <div className="divide-y">
        {contents.map(({ key, value, icon }) => (
          <div key={key} className="flex items-center gap-4 py-2 text-xl">
            <div className="size-6 [&>svg]:size-6">{icon}</div>
            <div className="text-muted-foreground">{key}</div>
            <div className="font-medium">{value}</div>
          </div>
        ))}
      </div>
      {isAdmin && (
        <Link href={`/team/${team._id}/edit`}>
          <RiEditBoxLine /> 編輯隊伍資訊
        </Link>
      )}
    </Card>
  );
};

export default TeamInfo;
