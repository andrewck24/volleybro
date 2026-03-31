"use client";
import { Button, Link } from "@/components/ui/button";
import { Card, CardDescription } from "@/components/ui/card";
import {
  Item,
  ItemAvatar,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { DarkMode } from "@/components/user/menu/dark-mode";
import { PlayerStatus } from "@/entities/player";
import { useProfile, useTeam, useUser, useUserPlayers } from "@/hooks/use-data";
import { apiClient } from "@/lib/api/api-client";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiPlus } from "react-icons/fi";
import {
  RiArrowDownWideLine,
  RiGroupLine,
  RiSettings4Line,
  RiUserAddLine,
  RiUserLine,
} from "react-icons/ri";

const Menu = ({ className }: { className?: string }) => {
  const { user } = useUser();

  return (
    <Card className={className}>
      <Button size="wide">
        <ItemAvatar
          className="size-6"
          src={user?.image}
          alt={user?.name}
          fallback={<RiUserLine />}
        />
        {!user ? <Skeleton className="h-6 w-64" /> : user?.name}
      </Button>
      <TeamList userId={user?._id} />
      <Button variant="secondary" size="wide">
        <RiSettings4Line />
        設定
      </Button>
      <DarkMode />
    </Card>
  );
};

function TeamList({ userId }: { userId?: string }) {
  const router = useRouter();
  const { profile, mutate: mutateProfile } = useProfile();
  const { players } = useUserPlayers(userId);
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
    <ItemGroup>
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
                <TeamItem
                  key={p._id}
                  teamId={p.teamId!}
                  variant={
                    profile?.activeTeamId === p.teamId ? "primary" : "default"
                  }
                  onClick={handleSwitchTeam}
                />
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
    </ItemGroup>
  );
}

function TeamItem({
  teamId,
  variant,
  onClick,
}: {
  teamId: string;
  variant: "primary" | "default";
  onClick: (teamId: string) => void;
}) {
  const { team, isLoading } = useTeam(teamId);

  return (
    <Item asChild variant={variant}>
      <Button className="h-fit" onClick={() => onClick(teamId)}>
        <ItemMedia variant="icon">
          <RiGroupLine className="h-4 w-4" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>
            {isLoading ? (
              <Skeleton data-testid="team-name-skeleton" className="h-4 w-24" />
            ) : (
              team?.name
            )}
          </ItemTitle>
        </ItemContent>
      </Button>
    </Item>
  );
}

export default Menu;
