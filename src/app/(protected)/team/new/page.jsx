"use client";
import TeamForm from "@/components/team/form";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";

const NewTeamPage = () => {
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const onSubmit = async (formData) => {
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const team = await res.json();
      mutate(`/api/teams/${team.id}`, team, false);
      return router.push(`/team/${team.id}?tab=about`);
    } catch (err) {
      console.log(err);
      // TODO: 改為彈出式警告
      // return form.setError("name", { message: "發生未知錯誤，請稍後再試" });
    }
  };

  return <TeamForm onSubmit={onSubmit} className="w-full" />;
};

export default NewTeamPage;
