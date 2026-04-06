import SetsOverview from "@/components/game/sets";

const GameSetsPage = async (props: { params: Promise<{ gameId: string }> }) => {
  const { gameId } = await props.params;

  return <SetsOverview gameId={gameId} />;
};

export default GameSetsPage;
