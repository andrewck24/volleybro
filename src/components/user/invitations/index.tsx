"use client";
import React, { useState } from "react";
import { FiPlus } from "react-icons/fi";
import { RiCheckLine, RiCloseLine } from "react-icons/ri";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button, Link } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TeamItem } from "@/components/custom/team-item";
import { Item } from "@/components/ui/item";
import NextLink from "next/link";
import { useUser } from "@/hooks/use-data";
import { useUserPlayers } from "@/hooks/use-data";
import { PlayerStatus } from "@/entities/player";
import { useToast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/api/api-client";
import { getErrorMessage, showErrorToast } from "@/lib/api/error-toast";

export const Invitations = ({ className }: { className?: string }) => {
  const { user } = useUser();
  const { players, isLoading, mutate } = useUserPlayers(user?._id);
  const { toast } = useToast();
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  const invitedPlayers = players.filter(
    (p) => p.status === PlayerStatus.INVITED
  );

  const handleAccept = async (playerId: string): Promise<void> => {
    setErrorMap((prev) => {
      const next = { ...prev };
      delete next[playerId];
      return next;
    });
    try {
      await apiClient(`/api/players/${playerId}/invitations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });

      toast({ title: "邀請已接受", description: "您已加入隊伍" });
      mutate();
    } catch (err) {
      setErrorMap((prev) => ({ ...prev, [playerId]: getErrorMessage(err) }));
      showErrorToast(err, toast);
    }
  };

  const handleReject = async (playerId: string): Promise<void> => {
    try {
      await apiClient(`/api/players/${playerId}/invitations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });

      toast({ title: "邀請已拒絕" });
      mutate();
    } catch (err) {
      showErrorToast(err, toast);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>隊伍邀請</CardTitle>
      </CardHeader>
      <Message />
      <div className="flex flex-col">
        {isLoading ? (
          <div className="px-3 py-2 text-muted-foreground">載入中...</div>
        ) : (
          invitedPlayers.map((player) => (
            <React.Fragment key={player._id}>
              <Item asChild>
                <NextLink href={`/team/${player.teamId}`}>
                  <TeamItem teamId={player.teamId!} />
                </NextLink>
              </Item>
              <div className="flex items-center gap-1 pl-12 pb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary"
                  onClick={() => handleAccept(player._id)}
                  aria-label="接受邀請"
                >
                  <RiCheckLine className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => handleReject(player._id)}
                  aria-label="拒絕邀請"
                >
                  <RiCloseLine className="h-5 w-5" />
                </Button>
              </div>
              {errorMap[player._id] && (
                <p className="px-3 pb-2 text-sm text-destructive">
                  {errorMap[player._id]}
                </p>
              )}
            </React.Fragment>
          ))
        )}
      </div>
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
