import { Header } from "@/components/layout/header";
import { GuidesForNewUser } from "@/components/custom/guides/new-user";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "球隊" };

const NoTeamPage = () => {
  return (
    <>
      <Header title="球隊" />
      <GuidesForNewUser />
    </>
  );
};

export default NoTeamPage;
