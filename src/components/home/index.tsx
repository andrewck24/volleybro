"use client";
import { ServerErrorState } from "@/components/custom/error/server-error-state";
import { GuidesForNewUser } from "@/components/custom/guides/new-user";
import LoadingCard from "@/components/custom/loading/card";
import { TeamMatches } from "@/components/home/matches";
import { useActiveTeamId, useProfile } from "@/hooks/use-data";

const Home = () => {
  const { isLoading, error, mutate } = useProfile();
  const defaultTeamId = useActiveTeamId();

  if (isLoading) {
    return <LoadingCard className="w-full" />;
  }

  if (error) return <ServerErrorState onRetry={() => mutate()} />;

  if (!defaultTeamId) return <GuidesForNewUser />;

  return <TeamMatches teamId={defaultTeamId} />;
};

export default Home;
