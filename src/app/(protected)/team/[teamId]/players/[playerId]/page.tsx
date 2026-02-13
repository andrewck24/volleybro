import { PlayerInfo } from "@/components/team/players/info";

const PlayerPage = async (props: {
  params: Promise<{ teamId: string; playerId: string }>;
}) => {
  const { teamId, playerId } = await props.params;

  return <PlayerInfo teamId={teamId} playerId={playerId} />;
};

export default PlayerPage;
