import { CreateForm } from "@/components/team/players/create-form";

const PlayerCreatePage = async (props: {
  params: Promise<{ teamId: string }>;
}) => {
  const { teamId } = await props.params;

  return <CreateForm teamId={teamId} />;
};

export default PlayerCreatePage;
