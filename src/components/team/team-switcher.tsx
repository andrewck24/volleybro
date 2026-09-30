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
      <DialogContent size="lg">
        <DialogHeader closeButton={false}>
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
