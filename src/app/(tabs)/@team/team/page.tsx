import { Header } from "@/components/layout/header";
import { TeamEntry } from "@/components/team/team-entry";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "球隊" };

const TeamEntryPage = () => {
  return (
    <>
      <Header title="球隊" />
      <TeamEntry />
    </>
  );
};

export default TeamEntryPage;
