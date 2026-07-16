"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { PlayerStatus } from "@/entities/player";
import { useProfile, useTeam, useUser, useUserPlayers } from "@/hooks/use-data";
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
            (team?.name ?? "球隊")
          )}
          <RiArrowDownWideLine className="size-5 shrink-0" />
        </Button>
      </DialogTrigger>
      <DialogContent size="lg" closeButton={false}>
        <DialogHeader>
          <DialogTitle>切換球隊</DialogTitle>
          <DialogDescription srOnly>選擇要切換的球隊</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <TeamList activeTeamId={teamId} onSelect={() => setOpen(false)} />
        </DialogBody>
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
  const { toast } = useToast();

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
      await mutateProfile();
      onSelect();
      router.replace(`/team/${newTeamId}`);
    } catch {
      toast({
        title: "切換失敗",
        description: "球隊切換未儲存，請稍後再試。",
        variant: "destructive",
      });
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
