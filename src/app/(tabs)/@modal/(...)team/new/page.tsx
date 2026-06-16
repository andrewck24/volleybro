"use client";
import { EditDialogContainer } from "@/components/layout/edit-dialog-container";
import TeamForm, { type TeamFormValues } from "@/components/team/form";
import { apiClient } from "@/lib/api/api-client";
import type { TeamView } from "@/lib/features/team/types";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useSWRConfig } from "swr";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

const NewTeamModalPage = () => {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [isDirty, setIsDirty] = useState(false);

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem("draft:team:new");
    } catch {}
  }, []);

  const onSubmit = async (formData: TeamFormValues) => {
    const team = await apiClient<TeamView>("/api/teams", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(formData),
    });
    mutate(`/api/teams/${team.id}`, team, false);
    router.push(`/team/${team.id}?tab=about`);
  };

  return (
    <EditDialogContainer
      title="建立球隊"
      fullPageHref="/team/new"
      isDirty={isDirty}
      clearDraft={clearDraft}
    >
      <TeamForm
        draftKey="draft:team:new"
        onSubmit={onSubmit}
        onStateChange={setIsDirty}
        className="w-full"
      />
    </EditDialogContainer>
  );
};

export default NewTeamModalPage;
