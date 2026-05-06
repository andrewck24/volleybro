"use client";
import { Header } from "@/components/layout/header";
import TeamForm from "@/components/team/form";
import { useTeam } from "@/hooks/use-data";
import { useRouter } from "next/navigation";
import { use } from "react";
import { useSWRConfig } from "swr";

const EditTeamPage = (props: { params: Promise<{ teamId: string }> }) => {
  const { teamId } = use(props.params);
  const router = useRouter();
  const { team, mutate } = useTeam(teamId);
  const { mutate: globalMutate } = useSWRConfig();

  const onSubmit = async (formData: { name: string; nickname: string }) => {
    const res = await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const teamData = await res.json();
    mutate({ ...team, ...teamData }, false);
    globalMutate(`/api/teams/${teamId}`);
    router.push(`/team/${teamId}?tab=about`);
  };

  return (
    <>
      <Header title="編輯球隊" backHref={`/team/${teamId}`} />
      <TeamForm team={team} onSubmit={onSubmit} className="w-full" />
    </>
  );
};

export default EditTeamPage;
