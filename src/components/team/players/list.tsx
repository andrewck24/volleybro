"use client";

import LoadingCard from "@/components/custom/loading/card";
import { ListItem } from "@/components/team/players/list-item";
import { useTeamPlayers } from "@/hooks/use-data";

interface PlayersListProps {
  teamId: string;
}

export function PlayersList({ teamId }: PlayersListProps) {
  const { players, isLoading, error } = useTeamPlayers(teamId);

  if (isLoading) return <LoadingCard />;
  if (error)
    return <div className="p-4 text-sm text-destructive">載入失敗</div>;

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
        <ListItem key={player._id} player={player} teamId={teamId} />
      ))}
    </div>
  );
}
