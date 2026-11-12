"use client";
import { ServerErrorState } from "@/components/custom/error/server-error-state";
import { Banner } from "@/components/game/banner";
import { Header } from "@/components/game/overview-header";
import { Stats } from "@/components/game/stats";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGame } from "@/hooks/use-data";

const GameOverview = ({ gameId }: { gameId: string }) => {
  const { game, error, isLoading, mutate } = useGame(gameId);
  if (error) return <ServerErrorState onRetry={() => mutate()} />;
  if (isLoading || !game) return <GameOverviewSkeleton />;

  return (
    <>
      <Header title="賽事總覽" url="/home" />
      <Banner gameId={gameId} />
      <Stats gameId={gameId} />
    </>
  );
};

export function GameOverviewSkeleton() {
  return (
    <>
      <div className="fixed top-0 left-0 z-10 flex h-[calc(env(safe-area-inset-top)+var(--header-height))] w-full items-center gap-4 border-b-2 border-accent bg-card px-[5%] pt-[env(safe-area-inset-top)]">
        <Skeleton className="size-(--control-size) rounded-full" />{" "}
        <Skeleton className="my-0.5 h-5 w-24 flex-1" />
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-card px-4 py-2">
        <div className="flex w-full flex-col items-center gap-1 pt-2">
          <Skeleton className="my-0.5 h-4 w-40" />
          <Skeleton className="my-0.5 h-4 w-28" />
        </div>

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

        <div className="flex w-full flex-row items-center justify-center gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="my-0.5 h-5 w-12" />
          ))}
        </div>

        <div className="grid w-full grid-cols-2 gap-2 py-2">
          <Skeleton className="h-(--control-size-lg) w-full" />
          <Skeleton className="h-(--control-size-lg) w-full" />
        </div>
      </div>

      <Card className="w-full">
        <CardHeader>
          <Skeleton className="my-0.5 h-5 w-20" />
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

export default GameOverview;
