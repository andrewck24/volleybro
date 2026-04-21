"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerStatus } from "@/entities/player";
import { useTeam, useUser, useUserPlayers, useProfile } from "@/hooks/use-data";
import { apiClient } from "@/lib/api/api-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RiArrowDownWideLine, RiGroupLine } from "react-icons/ri";

export const TeamSwitcher = ({ teamId }: { teamId: string }) => {
  const { team, isLoading } = useTeam(teamId);
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="gap-2 text-xl font-medium">
          {isLoading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            team?.name ?? "球隊"
          )}
          <RiArrowDownWideLine className="size-5 shrink-0" />
        </Button>
      </DialogTrigger>
      <DialogContent size="lg" closeButton={false}>
        <DialogHeader>
          <DialogTitle>切換球隊</DialogTitle>
        </DialogHeader>
        <TeamList activeTeamId={teamId} onSelect={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
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
  const { profile, mutate: mutateProfile } = useProfile();
  const { players } = useUserPlayers(user?.id);

  const joinedPlayers = players.filter(
    (p) => p.status === PlayerStatus.JOINED && p.teamId,
  );

  const handleSwitch = async (newTeamId: string) => {
    if (newTeamId === activeTeamId) {
      onSelect();
      return;
    }
    try {
      await apiClient("/api/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeTeamId: newTeamId }),
      });
      mutateProfile();
      onSelect();
      router.replace(`/team/${newTeamId}`);
    } catch {
      /* ignore */
    }
  };

  return (
    <ItemGroup>
      {joinedPlayers.map((p) => (
        <TeamItem
          key={p.id}
          teamId={p.teamId!}
          isActive={profile?.activeTeamId === p.teamId}
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
    <Item asChild variant={isActive ? "primary" : "default"}>
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
