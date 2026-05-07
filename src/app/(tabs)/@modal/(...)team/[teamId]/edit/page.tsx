"use client";
import { EditDialogContainer } from "@/components/layout/edit-dialog-container";
import TeamForm from "@/components/team/form";
import { useTeam } from "@/hooks/use-data";
import { useRouter } from "next/navigation";
import { use, useCallback, useState } from "react";
import { useSWRConfig } from "swr";

const EditTeamModalPage = (props: { params: Promise<{ teamId: string }> }) => {
  const { teamId } = use(props.params);
  const router = useRouter();
  const { team, mutate } = useTeam(teamId);
  const { mutate: globalMutate } = useSWRConfig();
  const [isDirty, setIsDirty] = useState(false);

  const clearDraft = useCallback(() => {
    try { sessionStorage.removeItem(`draft:team:${teamId}`); } catch {}
  }, [teamId]);

  const onSubmit = async (formData: { name: string; nickname: string }) => {
    const res = await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const teamData = await res.json();
    mutate({ ...team, ...teamData }, false);
    globalMutate(`/api/teams/${teamId}`);
    router.back();
  };

  return (
    <EditDialogContainer
      title="編輯球隊"
      fullPageHref={`/team/${teamId}/edit`}
      isDirty={isDirty}
      clearDraft={clearDraft}
    >
      <TeamForm
        draftKey={`draft:team:${teamId}`}
        defaultValues={team}
        onSubmit={onSubmit}
        onStateChange={setIsDirty}
        className="w-full"
      />
    </EditDialogContainer>
  );
};

export default EditTeamModalPage;
