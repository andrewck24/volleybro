"use client";
import { EditDialogContainer } from "@/components/layout/edit-dialog-container";
import TeamForm, { type TeamFormValues } from "@/components/team/form";
import { useTeam } from "@/hooks/use-data";
import { apiClient } from "@/lib/api/api-client";
import type { TeamView } from "@/lib/features/team/types";
import { useRouter } from "next/navigation";
import { use, useCallback, useState } from "react";
import { useSWRConfig } from "swr";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

const EditTeamModalPage = (props: { params: Promise<{ teamId: string }> }) => {
  const { teamId } = use(props.params);
  const router = useRouter();
  const { team, mutate } = useTeam(teamId);
  const { mutate: globalMutate } = useSWRConfig();
  const [isDirty, setIsDirty] = useState(false);

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(`draft:team:${teamId}`);
    } catch {}
  }, [teamId]);

  const onSubmit = async (formData: TeamFormValues) => {
    const teamData = await apiClient<TeamView>(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify(formData),
    });
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
