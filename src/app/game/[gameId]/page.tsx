import GameOverview from "@/components/game/overview";

const GameOverviewPage = async (props: {
  params: Promise<{ gameId: string }>;
}) => {
  const params = await props.params;
  const { gameId } = params;

  return <GameOverview gameId={gameId} />;
};

export default GameOverviewPage;
