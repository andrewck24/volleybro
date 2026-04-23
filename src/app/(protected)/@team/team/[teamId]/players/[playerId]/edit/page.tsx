import { Header } from "@/components/layout/header";
import { EditForm } from "@/components/team/players/edit-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "編輯球員" };

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
