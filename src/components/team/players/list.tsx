"use client";

import { ServerErrorState } from "@/components/custom/error/server-error-state";
import {
  Item,
  ItemAvatar,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeamPlayers } from "@/hooks/use-data";
import Link from "next/link";
import { FiUser } from "react-icons/fi";

interface PlayersListProps {
  teamId: string;
}

export function PlayersList({ teamId }: PlayersListProps) {
  const { players, isLoading, error, mutate } = useTeamPlayers(teamId);

  if (isLoading) return <PlayersListSkeleton />;
  if (error) return <ServerErrorState onRetry={() => mutate()} />;

  if (!players || players.length === 0) {
    return (
      <ItemGroup className="p-4 text-center text-sm text-muted-foreground">
        尚未新增任何球員
      </ItemGroup>
    );
  }

  const orderedPlayers = [...players].sort((a, b) => {
    if (a.number == null && b.number == null) return 0;
    if (a.number == null) return 1;
    if (b.number == null) return -1;
    return a.number - b.number;
  });

  return (
    <ItemGroup className="flex flex-col">
      {orderedPlayers.map((player) => (
        <Item key={player.id} asChild>
          <Link href={`/team/${teamId}/players/${player.id}`}>
            <ItemMedia variant="image">
              <ItemAvatar alt={player.name} fallback={<FiUser />} />
            </ItemMedia>
            <ItemContent>
              <ItemTitle className="h-5 text-base">{player.name}</ItemTitle>
              <ItemDescription className="h-5">
                {player.number != null && `#${player.number}`}
              </ItemDescription>
            </ItemContent>
          </Link>
        </Item>
      ))}
    </ItemGroup>
  );
}

export function PlayersListSkeleton() {
  return (
    <ItemGroup className="flex flex-col">
      {[...Array(8)].map((_, i) => (
        <Item key={i}>
          <ItemMedia variant="image">
            <Skeleton className="h-full w-full rounded-full" />
          </ItemMedia>
          <ItemContent>
            <Skeleton className="my-0.5 h-4 w-24" />
            <Skeleton className="my-0.5 h-4 w-20" />
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  );
}
