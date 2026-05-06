"use client";
import { EditDialogShell } from "@/components/team/edit-dialog-shell";
import Lineup from "@/components/team/lineup";
import { use } from "react";

const LineupModalPage = (props: { params: Promise<{ teamId: string }> }) => {
  const { teamId } = use(props.params);

  return (
    <EditDialogShell
      title="陣容設定"
      fullPageHref={`/team/${teamId}/lineup`}
      isDirty={false}
      clearDraft={() => {}}
    >
      <Lineup teamId={teamId} />
    </EditDialogShell>
  );
};

export default LineupModalPage;
