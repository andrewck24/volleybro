import { Header } from "@/components/layout/header";
import { CreateForm } from "@/components/team/players/create-form";

const PlayerCreatePage = async (props: {
  params: Promise<{ teamId: string }>;
}) => {
  const { teamId } = await props.params;

  return (
    <>
      <Header title="新增球員" backHref={`/team/${teamId}`} />
      <CreateForm teamId={teamId} />
    </>
  );
};

export default PlayerCreatePage;
