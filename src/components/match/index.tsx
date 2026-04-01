"use client";
import { ServerErrorState } from "@/components/custom/error/server-error-state";
import { Banner } from "@/components/match/banner";
import { Header } from "@/components/match/header";
import { Stats } from "@/components/match/stats";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecord } from "@/hooks/use-data";

const Match = ({ recordId }: { recordId: string }) => {
  const { record, error, isLoading, mutate } = useRecord(recordId);
  if (error) return <ServerErrorState onRetry={() => mutate()} />;
  if (isLoading || !record) return <MatchSkeleton />;

  return (
    <>
      <Header title="賽事總覽" url="/home" />
      <Banner recordId={recordId} />
      <Stats recordId={recordId} />
    </>
  );
};

export function MatchSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between p-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-5" />
      </div>
      <Card className="p-4">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-8 w-24" />
        </div>
      </Card>
      <Card className="p-4">
        <Skeleton className="mb-3 h-5 w-20" />
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

export default Match;
