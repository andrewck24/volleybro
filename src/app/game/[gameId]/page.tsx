import Game from "@/components/game";

const GamePage = async (props: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ si: string }>;
}) => {
  const { gameId } = await props.params;
  const { si } = await props.searchParams;

  return <Game gameId={gameId} setIndex={Number(si)} />;
};

export default GamePage;
