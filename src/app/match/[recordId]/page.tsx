import Match from "@/components/match";

const MatchPage = async (props: { params: Promise<{ recordId: string }> }) => {
  const params = await props.params;
  const { recordId } = params;

  return <Match recordId={recordId} />;
};

export default MatchPage;
