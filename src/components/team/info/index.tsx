"use client";
import {
  AlertDialog,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { canManageTeam, PlayerRole, PlayerStatus } from "@/entities/player";
import { useTeam, useTeamPlayers, useUser } from "@/hooks/use-data";
import { apiClient } from "@/lib/api/api-client";
import { getErrorMessage } from "@/lib/api/error-toast";
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
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  if (isTeamLoading || isPlayersLoading || isUserLoading)
    return <TeamInfoSkeleton />;

  const contents = [
    { key: "簡稱", value: team!.nickname, icon: <RiInformationLine /> },
    { key: "人數", value: players!.length, icon: <RiGroupLine /> },
  ];
  const currentUserPlayer = players?.find((p) => p.userId === user?._id);
  const isAdmin = currentUserPlayer ? canManageTeam(currentUserPlayer) : false;
  const isJoined = currentUserPlayer?.status === PlayerStatus.JOINED;
  const isOwner = currentUserPlayer?.role === PlayerRole.OWNER;

  const handleLeaveTeam = async () => {
    setIsLeaving(true);
    setLeaveError(null);
    try {
      await apiClient(`/api/players/${currentUserPlayer!._id}/invitations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
      });

      setLeaveOpen(false);
      toast({ title: "已離開隊伍" });
      mutate();
      router.push("/user/invitations");
    } catch (err) {
      setLeaveError(getErrorMessage(err));
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
        <Link href={`/team/${team!._id}/edit`}>
          <RiEditBoxLine /> 編輯隊伍資訊
        </Link>
      )}
      {isJoined && !isOwner && (
        <>
          <Separator />
          <div className="space-y-2 p-4">
            <h3 className="text-sm font-medium text-destructive">離開隊伍</h3>
            <AlertDialog
              open={leaveOpen}
              onOpenChange={(open) => {
                setLeaveOpen(open);
                if (!open) setLeaveError(null);
              }}
            >
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
                  {leaveError && (
                    <p className="w-full text-sm text-destructive">
                      {leaveError}
                    </p>
                  )}
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <Button
                    variant="destructive"
                    onClick={handleLeaveTeam}
                    disabled={isLeaving}
                  >
                    確認離開
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </Card>
  );
};

export function TeamInfoSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-24" />
      </CardHeader>
      <div className="divide-y">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <Skeleton className="size-6" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export default TeamInfo;
