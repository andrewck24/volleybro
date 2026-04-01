"use client";
import { ServerErrorState } from "@/components/custom/error/server-error-state";
import { GuidesForNewUser } from "@/components/custom/guides/new-user";
import { TeamMatches } from "@/components/home/matches";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveTeamId, useProfile } from "@/hooks/use-data";

const Home = () => {
  const { isLoading, error, mutate } = useProfile();
  const defaultTeamId = useActiveTeamId();

  if (isLoading) return <HomeSkeleton />;
  if (error) return <ServerErrorState onRetry={() => mutate()} />;
  if (!defaultTeamId) return <GuidesForNewUser />;

  return <TeamMatches teamId={defaultTeamId} />;
};

export function HomeSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <div className="space-y-2 px-4 pb-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-md" />
        ))}
      </div>
    </Card>
  );
}

export default Home;
