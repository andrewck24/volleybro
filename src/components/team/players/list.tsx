import LoadingCard from "@/components/custom/loading/card";
import { useTeamPlayers } from "@/hooks/use-data";

interface PlayersListProps {
  teamId: string;
}

export const PlayersList = ({ teamId }: PlayersListProps) => {
  const { players, isLoading, error } = useTeamPlayers(teamId);

  if (isLoading) return <LoadingCard />;
  if (error) return <div>Error loading players</div>;

  return <div>{players?.length ?? 0} players</div>;
};
