import Game from "@/components/game";

const GameEntryPage = async (props: {
  params: Promise<{ gameId: string; setIndex: string }>;
}) => {
  const { gameId, setIndex } = await props.params;

  return <Game gameId={gameId} setIndex={Number(setIndex)} />;
};

export default GameEntryPage;
