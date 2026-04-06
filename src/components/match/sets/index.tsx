"use client";
import { ServerErrorState } from "@/components/custom/error/server-error-state";
import { Teams } from "@/components/match/banner/teams";
import { Header } from "@/components/match/header";
import { SetsList } from "@/components/match/sets/list";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGame } from "@/hooks/use-data";

const SetsOverview = ({ gameId }: { gameId: string }) => {
  const { game, error, isLoading, mutate } = useGame(gameId);
  if (error) return <ServerErrorState onRetry={() => mutate()} />;
  if (isLoading || !game) return <MatchSetsSkeleton />;

  return (
    <Card className="w-full">
      <Header title="各局紀錄" url={`/match/${gameId}`} />
      <Teams gameId={gameId} />
      <SetsList gameId={gameId} />
    </Card>
  );
};

export function MatchSetsSkeleton() {
  return (
    <Card className="w-full">
      {/* mirrors Header: flex justify-between p-4 */}
      <div className="flex items-center justify-between p-4">
        <Skeleton className="my-0.5 h-4 w-24" /> {/* title */}
        <Skeleton className="size-5" /> {/* back icon */}
      </div>
      {/* mirrors Teams: flex row items-center py-2 gap-2 */}
      <div className="flex w-full flex-row items-center justify-center gap-2 py-2">
        <div className="flex w-20 flex-col items-center gap-2">
          <Skeleton className="size-15 rounded-md" /> {/* team icon */}
          <Skeleton className="my-0.5 h-12 w-full" /> {/* team name */}
        </div>
        <div className="flex flex-1 flex-row items-center justify-center gap-2">
          <Skeleton className="my-1 h-7 w-8" /> {/* set score: text-3xl */}
          <Skeleton className="h-5 w-4" /> {/* colon */}
          <Skeleton className="my-1 h-7 w-8" />
        </div>
        <div className="flex w-20 flex-col items-center gap-2">
          <Skeleton className="size-15 rounded-md" />
          <Skeleton className="my-0.5 h-12 w-full" />
        </div>
      </div>
      {/* mirrors SetsList: Accordion items */}
      <div className="flex flex-col gap-2 px-4 pb-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-md border p-4"
          >
            <Skeleton className="my-0.5 h-6 w-8" /> {/* score */}
            <Skeleton className="my-0.5 h-5 w-16" /> {/* set label */}
            <Skeleton className="my-0.5 h-6 w-8" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export default SetsOverview;
