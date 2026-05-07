import { Header } from "@/components/layout/header";
import { EditForm } from "@/components/team/players/edit-form";

const EditPlayerPage = async (props: {
  params: Promise<{ teamId: string; playerId: string }>;
}) => {
  const { teamId, playerId } = await props.params;

  return (
    <>
      <Header title="編輯球員" backHref={`/team/${teamId}`} />
      <EditForm teamId={teamId} playerId={playerId} />
    </>
  );
};

export default EditPlayerPage;
