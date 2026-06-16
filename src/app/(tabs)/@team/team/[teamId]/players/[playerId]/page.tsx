import { Header } from "@/components/layout/header";
import { PlayerInfo } from "@/components/team/players/info";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "球員資料" };

const PlayerPage = async (props: {
  params: Promise<{ teamId: string; playerId: string }>;
}) => {
  const { teamId, playerId } = await props.params;

  return (
    <>
      <Header title="球員資料" backHref={`/team/${teamId}`} />
      <PlayerInfo teamId={teamId} playerId={playerId} />
    </>
  );
};

export default PlayerPage;
