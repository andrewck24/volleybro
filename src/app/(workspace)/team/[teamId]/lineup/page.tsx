import { Header } from "@/components/layout/header";
import Lineup from "@/components/team/lineup";

const LineupPage = async (props: { params: Promise<{ teamId: string }> }) => {
  const { teamId } = await props.params;

  return (
    <>
      <Header title="陣容設定" backHref={`/team/${teamId}`} />
      <Lineup teamId={teamId} />
    </>
  );
};

export default LineupPage;
