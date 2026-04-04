"use client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, Link } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemFooter,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Player, PlayerStatus } from "@/entities/player";
import { useTeam, useUser, useUserPlayers } from "@/hooks/use-data";
import { apiClient } from "@/lib/api/api-client";
import { showErrorToast } from "@/lib/api/error-toast";
import NextLink from "next/link";
import { useState } from "react";
import { FiPlus } from "react-icons/fi";
import { RiCheckLine, RiCloseLine, RiGroupLine } from "react-icons/ri";

export const Invitations = ({ className }: { className?: string }) => {
  const { user } = useUser();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>隊伍邀請</CardTitle>
      </CardHeader>
      <Message />
      <InvitationList userId={user?._id} />
      <Separator content="沒有找到你的隊伍嗎？你可以..." />
      <Link size="lg" href="/team/new">
        <FiPlus />
        建立隊伍
      </Link>
      <CardDescription className="text-center">
        或聯絡你的隊伍管理者
      </CardDescription>
    </Card>
  );
};

function InvitationList({ userId }: { userId?: string }) {
  const { players, isLoading, mutate } = useUserPlayers(userId);
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const invitedPlayers = players.filter(
    (p) => p.status === PlayerStatus.INVITED,
  );

  const handleInvitation = async (
    playerId: string,
    action: "accept" | "reject",
  ): Promise<void> => {
    setProcessingId(playerId);
    try {
      await apiClient(`/api/players/${playerId}/invitations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      toast(
        action === "accept"
          ? { title: "邀請已接受", description: "您已加入隊伍" }
          : { title: "邀請已拒絕" },
      );
      mutate();
    } catch (err) {
      showErrorToast(err, toast);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <ItemGroup className="flex flex-col">
        <InvitationItemSkeleton />
        <InvitationItemSkeleton />
        <InvitationItemSkeleton />
      </ItemGroup>
    );
  }

  return (
    <ItemGroup className="flex flex-col">
      {invitedPlayers.map((player) => (
        <InvitationItem
          key={player._id}
          player={player}
          processingId={processingId}
          handleInvitation={handleInvitation}
        />
      ))}
    </ItemGroup>
  );
}

function InvitationItem({
  player,
  processingId,
  handleInvitation,
}: {
  player: Player;
  processingId: string | null;
  handleInvitation: (id: string, action: "accept" | "reject") => void;
}) {
  const { team, isLoading } = useTeam(player.teamId!);
  if (isLoading) return <InvitationItemSkeleton />;

  return (
    <Item className="relative items-start hover:bg-accent/50">
      <NextLink
        href={`/team/${player.teamId}`}
        className="absolute inset-0 z-0"
        aria-label="前往隊伍"
      />
      <ItemMedia variant="icon">
        <RiGroupLine className="h-4 w-4" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="h-8">{team?.name}</ItemTitle>
        <ItemFooter className="relative z-10 flex w-fit items-center gap-2">
          <Button
            size="sm"
            className="pr-3 pl-2"
            onClick={() => handleInvitation(player._id, "accept")}
            aria-label="接受邀請"
            loading={processingId === player._id}
            disabled={processingId !== null}
          >
            <RiCheckLine className="size-5" />
            接受邀請
          </Button>
          <Button
            variant="secondary"
            className="pr-3 pl-2"
            size="sm"
            onClick={() => handleInvitation(player._id, "reject")}
            aria-label="拒絕邀請"
            loading={processingId === player._id}
            disabled={processingId !== null}
          >
            <RiCloseLine className="size-5" />
            拒絕邀請
          </Button>
        </ItemFooter>
      </ItemContent>
    </Item>
  );
}

function InvitationItemSkeleton() {
  return (
    <Item className="items-start hover:bg-accent/50">
      <ItemMedia variant="icon">
        <Skeleton className="size-4" />
      </ItemMedia>
      <ItemContent>
        <Skeleton className="my-2 h-4 w-32" />
        <ItemFooter className="flex w-fit items-center gap-2">
          <Skeleton className="h-8 w-23" />
          <Skeleton className="h-8 w-23" />
        </ItemFooter>
      </ItemContent>
    </Item>
  );
}

const Message = () => {
  return (
    <Alert className="w-full">
      <AlertTitle>歡迎使用 VolleyBro !</AlertTitle>
      <AlertDescription>
        請查看下方隊伍邀請。若您的隊伍是初次使用
        VolleyBro，請點選下方按鈕創建隊伍。
      </AlertDescription>
    </Alert>
  );
};
