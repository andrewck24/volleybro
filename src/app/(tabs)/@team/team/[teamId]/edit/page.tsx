"use client";
import { use } from "react";
import { useTeam } from "@/hooks/use-data";
import { useRouter } from "next/navigation";
import TeamForm from "@/components/team/form";

const EditTeamPage = (props: { params: Promise<{ teamId: string }> }) => {
  const params = use(props.params);
  const router = useRouter();
  const { teamId } = params;
  const { team, mutate } = useTeam(teamId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (formData: any) => {
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const teamData = await res.json();
      mutate({ ...team, ...teamData }, false);
      return router.push(`/team/${teamId}?tab=about`);
    } catch (error) {
      console.error(error);
      // TODO: 改為彈出式警告
    }
  };

  return (
    <TeamForm
      draftKey={`draft:team:${teamId}`}
      defaultValues={team}
      onSubmit={onSubmit}
      className="w-full"
    />
  );
};

export default EditTeamPage;
