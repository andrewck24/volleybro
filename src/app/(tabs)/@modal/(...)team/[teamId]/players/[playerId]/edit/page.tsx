"use client";
import { EditDialogShell } from "@/components/team/edit-dialog-shell";
import { EditForm } from "@/components/team/players/edit-form";
import { use, useCallback, useState } from "react";

const PlayerEditModalPage = (props: {
  params: Promise<{ teamId: string; playerId: string }>;
}) => {
  const { teamId, playerId } = use(props.params);
  const [isDirty, setIsDirty] = useState(false);

  const clearDraft = useCallback(() => {
    try { sessionStorage.removeItem(`draft:player:${playerId}`); } catch {}
  }, [playerId]);

  return (
    <EditDialogShell
      title="編輯球員"
      fullPageHref={`/team/${teamId}/players/${playerId}/edit`}
      isDirty={isDirty}
      clearDraft={clearDraft}
    >
      <EditForm
        teamId={teamId}
        playerId={playerId}
        onStateChange={setIsDirty}
      />
    </EditDialogShell>
  );
};

export default PlayerEditModalPage;
