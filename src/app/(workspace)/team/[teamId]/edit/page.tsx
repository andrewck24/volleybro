import { Header } from "@/components/layout/header";
import { EditTeamWorkspace } from "@/components/team/form";

const EditTeamPage = async (props: { params: Promise<{ teamId: string }> }) => {
  const { teamId } = await props.params;

  return (
    <>
      <Header title="編輯球隊" backHref={`/team/${teamId}`} />
      <EditTeamWorkspace teamId={teamId} />
    </>
  );
};

export default EditTeamPage;
