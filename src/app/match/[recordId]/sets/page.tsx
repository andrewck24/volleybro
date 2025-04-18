const MatchSetsPage = async (props: {
  params: Promise<{ recordId: string }>;
}) => {
  const { recordId } = await props.params;

  return (
    <div>
      <h1>Sets</h1>
    </div>
  );
};

export default MatchSetsPage;
