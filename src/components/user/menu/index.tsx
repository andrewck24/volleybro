"use client";
import { TeamItem } from "@/components/custom/list-item/team-item";
import { Button, Link } from "@/components/ui/button";
import { Card, CardDescription } from "@/components/ui/card";
import { Item } from "@/components/ui/item";
import { DarkMode } from "@/components/user/menu/dark-mode";
import { PlayerStatus } from "@/entities/player";
import { useProfile, useUser, useUserPlayers } from "@/hooks/use-data";
import { apiClient } from "@/lib/api/api-client";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiPlus } from "react-icons/fi";
import {
  RiArrowDownWideLine,
  RiSettings4Line,
  RiUserAddLine,
  RiUserLine,
} from "react-icons/ri";

const Menu = ({ className }: { className?: string }) => {
  const router = useRouter();
  const { user } = useUser();
  const { profile, mutate: mutateProfile } = useProfile();
  const { players } = useUserPlayers(user?._id);
  const [extendTeams, setExtendTeams] = useState(false);

  const joinedPlayers = players.filter(
    (p) => p.status === PlayerStatus.JOINED && p.teamId,
  );

  const handleSwitchTeam = async (teamId: string) => {
    try {
      await apiClient("/api/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeTeamId: teamId }),
      });
      mutateProfile();
      router.push(`/team/${teamId}`);
    } catch {
      /* ignore */
    }
  };

  return (
    <Card className={className}>
      <Button size="wide">
        {user?.image ? (
          <Image
            src={user.image}
            alt={user.name}
            width={24}
            height={24}
            className="rounded-full"
          />
        ) : (
          <RiUserLine />
        )}
        {!user ? (
          <span className="h-6 w-[16rem] animate-pulse rounded-md bg-muted" />
        ) : (
          user?.name
        )}
      </Button>
      <Button
        variant="secondary"
        size="wide"
        onClick={() => setExtendTeams(!extendTeams)}
      >
        <RiUserAddLine />
        <span className="flex flex-1 justify-start">隊伍與邀請</span>
        <RiArrowDownWideLine
          className={cn(
            "transition-transform duration-200",
            extendTeams && "rotate-180",
          )}
        />
      </Button>
      {extendTeams && (
        <>
          {joinedPlayers.length > 0 && (
            <>
              <CardDescription>已加入隊伍</CardDescription>
              {joinedPlayers.map((p) => (
                <Item
                  key={p._id}
                  asChild
                  className={cn(
                    profile?.activeTeamId === p.teamId &&
                      "bg-primary text-primary-foreground",
                  )}
                >
                  <button onClick={() => handleSwitchTeam(p.teamId!)}>
                    <TeamItem teamId={p.teamId!} />
                  </button>
                </Item>
              ))}
            </>
          )}
          <CardDescription>
            沒有你的隊伍嗎？你可以聯絡你的隊伍管理者，或...
          </CardDescription>
          <Link variant="ghost" size="lg" href="/user/invitations">
            <FiPlus />
            查看更多
          </Link>
        </>
      )}
      <Button variant="secondary" size="wide">
        <RiSettings4Line />
        設定
      </Button>
      <DarkMode />
    </Card>
  );
};

export default Menu;
