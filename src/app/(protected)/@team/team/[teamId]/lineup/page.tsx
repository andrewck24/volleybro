"use client";
import { Header } from "@/components/layout/header";
import Lineup from "@/components/team/lineup";
import { use } from "react";

const LineupPage = (props: { params: Promise<{ teamId: string }> }) => {
  const { teamId } = use(props.params);

  return (
    <>
      <Header title="陣容設定" backHref={`/team/${teamId}`} />
      <Lineup teamId={teamId} />
    </>
  );
};

export default LineupPage;
