"use client";
import { EditDialogContainer } from "@/components/layout/edit-dialog-container";
import { NewTeamWorkspace } from "@/components/team/form";
import { useCallback, useState } from "react";

const NewTeamModalPage = () => {
  const [isDirty, setIsDirty] = useState(false);

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem("draft:team:new");
    } catch {}
  }, []);

  return (
    <EditDialogContainer
      title="建立球隊"
      fullPageHref="/team/new"
      isDirty={isDirty}
      clearDraft={clearDraft}
    >
      <NewTeamWorkspace onStateChange={setIsDirty} />
    </EditDialogContainer>
  );
};

export default NewTeamModalPage;
