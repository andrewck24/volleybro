"use client";
import { EditDialogShell } from "@/components/team/edit-dialog-shell";
import { CreateForm } from "@/components/team/players/create-form";
import { use, useCallback, useState } from "react";

const PlayerCreateModalPage = (props: {
  params: Promise<{ teamId: string }>;
}) => {
  const { teamId } = use(props.params);
  const [isDirty, setIsDirty] = useState(false);

  const clearDraft = useCallback(() => {
    try { sessionStorage.removeItem(`draft:player:new:${teamId}`); } catch {}
  }, [teamId]);

  return (
    <EditDialogShell
      title="新增球員"
      fullPageHref={`/team/${teamId}/players/new`}
      isDirty={isDirty}
      clearDraft={clearDraft}
    >
      <CreateForm teamId={teamId} onStateChange={setIsDirty} />
    </EditDialogShell>
  );
};

export default PlayerCreateModalPage;
