"use client";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useProfile } from "@/hooks/use-data";
import { FiPlus } from "react-icons/fi";
import {
  RiArrowDownWideLine,
  RiSettings4Line,
  RiUserLine,
  RiGroupLine,
  RiUserAddLine,
} from "react-icons/ri";
import { Button, Link } from "@/components/ui/button";
import { Card, CardDescription } from "@/components/ui/card";
import { DarkMode } from "@/components/user/menu/dark-mode";

// TODO(8.5): Rewrite this component — team list should come from player-based
// SWR query, team switch via PATCH /api/profiles (activeTeamId). The current
// implementation referenced the deleted /api/users/teams endpoint and has been
// stubbed out to let the build pass.

const Menu = ({ className }: { className?: string }) => {
  const router = useRouter();
  const { user } = useUser();
  const { profile } = useProfile();
  const [extendTeams, setExtendTeams] = useState(false);

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
          <span className="h-6 rounded-md animate-pulse bg-muted w-[16rem]" />
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
        <span className="flex justify-start flex-1">隊伍與邀請</span>
        <RiArrowDownWideLine
          className={cn(
            "transition-transform duration-200",
            extendTeams && "rotate-180"
          )}
        />
      </Button>
      {extendTeams && (
        <>
          {profile?.activeTeamId && (
            <>
              <CardDescription>已加入隊伍</CardDescription>
              <Button
                variant="ghost"
                size="wide"
                onClick={() => router.push(`/team/${profile.activeTeamId}`)}
              >
                <RiGroupLine />
                <span className="flex justify-start flex-1">目前隊伍</span>
              </Button>
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
