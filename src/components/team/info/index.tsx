"use client";
import LoadingCard from "@/components/custom/loading/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, Link } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { canManageTeam, PlayerRole, PlayerStatus } from "@/entities/player";
import { apiClient, ApiClientError } from "@/lib/api/api-client";
import { useTeam, useTeamPlayers, useUser } from "@/hooks/use-data";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RiEditBoxLine, RiGroupLine, RiInformationLine } from "react-icons/ri";

const TeamInfo = ({ teamId }: { teamId: string }) => {
  const { team, isLoading: isTeamLoading } = useTeam(teamId);
  const {
    players,
    isLoading: isPlayersLoading,
    mutate,
  } = useTeamPlayers(teamId);
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
    setIsLeaving(true);
    try {
      await apiClient(`/api/players/${currentUserPlayer._id}/invitations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
      });

      toast({ title: "已離開隊伍" });
      mutate();
      router.push("/user/invitations");
    } catch (err) {
      const detail = err instanceof ApiClientError ? err.detail : "發生錯誤";
      toast({
        title: "離隊失敗",
        description: detail,
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
          <div className="space-y-2 p-4">
            <h3 className="text-sm font-medium text-destructive">離開隊伍</h3>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={isLeaving}
                >
                  {isLeaving ? "離開中..." : "離開隊伍"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>確定要離開這個隊伍嗎？</AlertDialogTitle>
                  <AlertDialogDescription>
                    離開後將無法查看隊伍相關資訊與個人數據。此操作無法撤銷，若要重新加入需再次接受邀請。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button variant="destructive" onClick={handleLeaveTeam}>
                      確認離開
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </Card>
  );
};

export default TeamInfo;
