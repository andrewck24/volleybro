import { Header } from "@/components/layout/header";
import Team from "@/components/team";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "球隊" };

const TeamPage = async (props: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ tab: string }>;
}) => {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { teamId } = params;

  return (
    <>
      <Header title="球隊" />
      <Team teamId={teamId} tab={searchParams?.tab} />
    </>
  );
};

export default TeamPage;
