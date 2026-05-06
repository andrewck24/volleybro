"use client";
import { EditDialogShell } from "@/components/team/edit-dialog-shell";
import TeamForm from "@/components/team/form";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useSWRConfig } from "swr";

const NewTeamModalPage = () => {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [isDirty, setIsDirty] = useState(false);

  const clearDraft = useCallback(() => {
    try { sessionStorage.removeItem("draft:team:new"); } catch {}
  }, []);

  const onSubmit = async (formData: { name: string; nickname: string }) => {
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const team = await res.json();
    mutate(`/api/teams/${team.id}`, team, false);
    router.push(`/team/${team.id}?tab=about`);
  };

  return (
    <EditDialogShell
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
    </EditDialogShell>
  );
};

export default NewTeamModalPage;
