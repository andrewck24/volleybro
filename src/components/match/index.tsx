"use client";
import { ServerErrorState } from "@/components/custom/error/server-error-state";
import { Banner } from "@/components/match/banner";
import { Header } from "@/components/match/header";
import { Stats } from "@/components/match/stats";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGame } from "@/hooks/use-data";

const Match = ({ gameId }: { gameId: string }) => {
  const { game, error, isLoading, mutate } = useGame(gameId);
  if (error) return <ServerErrorState onRetry={() => mutate()} />;
  if (isLoading || !game) return <MatchSkeleton />;

  return (
    <>
      <Header title="賽事總覽" url="/home" />
      <Banner gameId={gameId} />
      <Stats gameId={gameId} />
    </>
  );
};

export function MatchSkeleton() {
  return (
    <>
      {/* mirrors Header: fixed top bar with back button + title */}
      <div className="flex h-[calc(env(safe-area-inset-top)+3rem)] w-full items-center gap-4 border-b-2 border-accent bg-card px-[5%] pt-[env(safe-area-inset-top)]">
        <Skeleton className="size-9 rounded-md" /> {/* back button */}
        <Skeleton className="my-0.5 h-5 w-24 flex-1" /> {/* title */}
      </div>
      {/* mirrors Banner: bg-card flex-col */}
      <div className="flex w-full flex-col items-center justify-center bg-card px-4 py-2">
        {/* mirrors Info: match name + location */}
        <div className="flex w-full flex-col items-center gap-1 pt-2">
          <Skeleton className="my-0.5 h-4 w-40" />
          <Skeleton className="my-0.5 h-4 w-28" />
        </div>
        {/* mirrors Teams: flex row with avatars + set score */}
        <div className="flex w-full flex-row items-center justify-center gap-2 py-2">
          <div className="flex w-20 flex-col items-center gap-2">
            <Skeleton className="size-15 rounded-md" />
            <Skeleton className="my-0.5 h-12 w-full" />
          </div>
          <div className="flex flex-1 flex-row items-center justify-center gap-2">
            <Skeleton className="my-1 h-7 w-8" />
            <Skeleton className="h-5 w-2" />
            <Skeleton className="my-1 h-7 w-8" />
          </div>
          <div className="flex w-20 flex-col items-center gap-2">
            <Skeleton className="size-15 rounded-md" />
            <Skeleton className="my-0.5 h-12 w-full" />
          </div>
        </div>
        {/* mirrors Scores: set-by-set scores row */}
        <div className="flex w-full flex-row items-center justify-center gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="my-0.5 h-5 w-12" />
          ))}
        </div>
        {/* mirrors action buttons grid */}
        <div className="grid w-full grid-cols-2 gap-2 py-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
      {/* mirrors Stats: Card with CardHeader + Tabs */}
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="my-0.5 h-5 w-20" /> {/* CardTitle */}
        </CardHeader>
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="my-0.5 h-4 w-24" />
              <Skeleton className="my-0.5 h-4 w-16" />
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

export default Match;
