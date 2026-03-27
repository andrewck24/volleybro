"use client";

import Link from "next/link";

import LoadingCard from "@/components/custom/loading/card";
import { ServerErrorState } from "@/components/custom/error/server-error-state";
import { PersonItem } from "@/components/custom/person-item";
import { Item } from "@/components/ui/item";
import type { Player } from "@/entities/player";
import { POSITION_LABELS } from "@/lib/constants/labels";
import { useTeamPlayers } from "@/hooks/use-data";

interface PlayersListProps {
  teamId: string;
}

export function PlayersList({ teamId }: PlayersListProps) {
  const { players, isLoading, error, mutate } = useTeamPlayers(teamId);

  if (isLoading) return <LoadingCard />;
  if (error) return <ServerErrorState onRetry={() => mutate()} />;

  if (!players || players.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        尚未新增任何球員
      </div>
    );
  }

  const orderedPlayers = [...players].sort((a, b) => {
    if (a.number == null && b.number == null) return 0;
    if (a.number == null) return 1;
    if (b.number == null) return -1;
    return a.number - b.number;
  });

  return (
    <div className="flex flex-col gap-2">
      {orderedPlayers.map((player) => (
        <Item key={player._id} asChild>
          <Link href={`/team/${teamId}/players/${player._id}`}>
            <PersonItem name={player.name}>
              <PlayerMetadata player={player} />
            </PersonItem>
          </Link>
        </Item>
      ))}
    </div>
  );
}

function PlayerMetadata({ player }: { player: Player }) {
  const positionLabel = player.position
    ? POSITION_LABELS[player.position]
    : undefined;

  return (
    <>
      {player.number && (
        <span className="shrink-0 text-sm text-muted-foreground">
          #{player.number}
        </span>
      )}
      {positionLabel && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {positionLabel}
        </span>
      )}
    </>
  );
}
