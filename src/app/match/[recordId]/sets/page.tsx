import SetsOverview from "@/components/match/sets";

const MatchSetsPage = async (props: {
  params: Promise<{ recordId: string }>;
}) => {
  const { recordId } = await props.params;

  return <SetsOverview recordId={recordId} />;
};

export default MatchSetsPage;
