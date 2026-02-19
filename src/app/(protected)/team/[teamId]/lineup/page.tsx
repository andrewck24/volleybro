"use client";
import Lineup from "@/components/team/lineup";
import { use } from "react";

const LineupPage = (props: { params: Promise<{ teamId: string }> }) => {
  const params = use(props.params);
  const { teamId } = params;

  return <Lineup teamId={teamId} />;
};

export default LineupPage;
