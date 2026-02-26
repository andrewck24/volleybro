"use client";
import LoadingCard from "@/components/custom/loading/card";
import { Button, Link } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { canManageTeam, PlayerRole, PlayerStatus } from "@/entities/player";
import { useTeam, useTeamPlayers, useUser } from "@/hooks/use-data";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RiEditBoxLine, RiGroupLine, RiInformationLine } from "react-icons/ri";
import { useToast } from "@/components/ui/use-toast";

const TeamInfo = ({ teamId }: { teamId: string }) => {
  const { team, isLoading: isTeamLoading } = useTeam(teamId);
  const { players, isLoading: isPlayersLoading, mutate } = useTeamPlayers(teamId);
  const { user, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);

  if (isTeamLoading || isPlayersLoading || isUserLoading)
    return <LoadingCard />;

  const contents = [
    { key: "簡稱", value: team.nickname, icon: <RiInformationLine /> },
    { key: "人數", value: players.length, icon: <RiGroupLine /> },
  ];
  const currentUserPlayer = players?.find((p) => p.userId === user?._id);
  const isAdmin = canManageTeam(currentUserPlayer);
  const isJoined = currentUserPlayer?.status === PlayerStatus.JOINED;
  const isOwner = currentUserPlayer?.role === PlayerRole.OWNER;

  const handleLeaveTeam = async () => {
    if (!currentUserPlayer) return;
    if (!window.confirm("確定要離開這個隊伍嗎？")) return;

    setIsLeaving(true);
    try {
      const res = await fetch(
        `/api/players/${currentUserPlayer._id}/invitations`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "leave" }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "離隊失敗");
      }

      toast({ title: "已離開隊伍" });
      mutate();
      router.push("/user/invitations");
    } catch (err) {
      toast({
        title: "離隊失敗",
        description: err instanceof Error ? err.message : "發生錯誤",
        variant: "destructive",
      });
    } finally {
      setIsLeaving(false);
    }
  };

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
      {isJoined && !isOwner && (
        <>
          <Separator />
          <div className="p-4 space-y-2">
            <h3 className="text-sm font-medium text-destructive">離開隊伍</h3>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleLeaveTeam}
              disabled={isLeaving}
            >
              {isLeaving ? "離開中..." : "離開隊伍"}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
};

export default TeamInfo;
