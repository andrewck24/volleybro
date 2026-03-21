import { EditForm } from "@/components/team/players/edit-form";

const EditPlayerPage = async (props: {
  params: Promise<{ teamId: string; playerId: string }>;
}) => {
  const { teamId, playerId } = await props.params;

  return <EditForm teamId={teamId} playerId={playerId} />;
};

export default EditPlayerPage;
