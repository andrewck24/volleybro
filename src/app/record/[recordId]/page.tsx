const RecordPage = async (props: {
  params: Promise<{ recordId: string }>;
  searchParams: Promise<{ si: string }>;
}) => {
  const { recordId } = await props.params;
  const { si: setIndex } = await props.searchParams;

  return (
    <div>
      {recordId}
      {setIndex}
    </div>
  );
};

export default RecordPage;
