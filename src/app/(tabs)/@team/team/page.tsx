import { Header } from "@/components/layout/header";
import type { Metadata } from "next";
import { TeamEntry } from "./team-entry";

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
