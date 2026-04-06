import SetsOverview from "@/components/match/sets";

const MatchSetsPage = async (props: {
  params: Promise<{ gameId: string }>;
}) => {
  const { gameId } = await props.params;

  return <SetsOverview gameId={gameId} />;
};

export default MatchSetsPage;
