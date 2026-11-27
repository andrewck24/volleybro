"use client";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerStatus } from "@/entities/player";
import {
  useActiveTeamId,
  useTeam,
  useUser,
  useUserPlayers,
} from "@/hooks/use-data";
import { useActiveTeamPreference } from "@/hooks/use-active-team-preference";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RiArrowDownWideLine, RiGroupLine } from "react-icons/ri";

export const TeamSwitcher = ({ teamId }: { teamId: string }) => {
  const { team, isLoading } = useTeam(teamId);
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" className="gap-2 text-xl font-medium">
          {isLoading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            (team?.name ?? "球隊")
          )}
          <RiArrowDownWideLine className="size-5 shrink-0" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="mx-auto max-h-[85dvh] max-w-page">
        <DrawerHandle />
        <DrawerHeader className="px-(--page-gutter) text-left">
          <DrawerTitle>切換球隊</DrawerTitle>
          <DrawerDescription className="sr-only">
            選擇要切換的球隊
          </DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 overflow-y-auto px-(--page-gutter) pb-[max(1rem,env(safe-area-inset-bottom))]">
          <TeamList activeTeamId={teamId} onSelect={() => setOpen(false)} />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

function TeamList({
  activeTeamId,
  onSelect,
}: {
  activeTeamId: string;
  onSelect: () => void;
}) {
  const router = useRouter();
  const { user } = useUser();
  const { teamId: currentActiveTeamId } = useActiveTeamId();
  const { save } = useActiveTeamPreference();
  const { players } = useUserPlayers(user?.id);

  const joinedPlayers = players.filter(
    (p) => p.status === PlayerStatus.JOINED && p.teamId,
  );

  const handleSwitch = (newTeamId: string) => {
    if (user && newTeamId !== activeTeamId) {
      save({
        userId: user.id,
        teamId: newTeamId,
      });
      router.replace(`/team/${newTeamId}`);
    }
    onSelect();
  };

  return (
    <ItemGroup>
      {joinedPlayers.map((p) => (
        <TeamItem
          key={p.id}
          teamId={p.teamId!}
          isActive={currentActiveTeamId === p.teamId}
          onClick={handleSwitch}
        />
      ))}
    </ItemGroup>
  );
}

function TeamItem({
  teamId,
  isActive,
  onClick,
}: {
  teamId: string;
  isActive: boolean;
  onClick: (teamId: string) => void;
}) {
  const { team, isLoading } = useTeam(teamId);

  return (
    <Item asChild>
      <button
        type="button"
        aria-pressed={isActive}
        onClick={() => onClick(teamId)}
      >
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
      </button>
    </Item>
  );
}
