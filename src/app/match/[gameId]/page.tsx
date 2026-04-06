import Match from "@/components/match";

const MatchPage = async (props: { params: Promise<{ gameId: string }> }) => {
  const params = await props.params;
  const { gameId } = params;

  return <Match gameId={gameId} />;
};

export default MatchPage;
