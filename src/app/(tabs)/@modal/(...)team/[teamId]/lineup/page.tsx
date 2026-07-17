"use client";
import { EditDialogContainer } from "@/components/layout/edit-dialog-container";
import Lineup from "@/components/team/lineup";
import { use } from "react";

const LineupModalPage = (props: { params: Promise<{ teamId: string }> }) => {
  const { teamId } = use(props.params);

  return (
    <EditDialogContainer
      title="陣容設定"
      fullPageHref={`/team/${teamId}/lineup`}
      isDirty={false}
      clearDraft={() => {}}
    >
      <Lineup teamId={teamId} />
    </EditDialogContainer>
  );
};

export default LineupModalPage;
