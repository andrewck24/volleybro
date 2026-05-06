"use client";
import { Header } from "@/components/layout/header";
import TeamForm from "@/components/team/form";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";

const NewTeamPage = () => {
  const router = useRouter();
  const { mutate } = useSWRConfig();

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
    <>
      <Header title="建立球隊" backHref="/home" />
      <TeamForm team={undefined} onSubmit={onSubmit} className="w-full" />
    </>
  );
};

export default NewTeamPage;
