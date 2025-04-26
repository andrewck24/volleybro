import Record from "@/components/record";

const RecordPage = async (props: {
  params: Promise<{ recordId: string }>;
  searchParams: Promise<{ si: string }>;
}) => {
  const { recordId } = await props.params;
  const { si: setIndex } = await props.searchParams;

  return <Record recordId={recordId} />;
};

export default RecordPage;
