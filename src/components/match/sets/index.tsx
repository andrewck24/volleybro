"use client";
import { ServerErrorState } from "@/components/custom/error/server-error-state";
import { Teams } from "@/components/match/banner/teams";
import { Header } from "@/components/match/header";
import { SetsList } from "@/components/match/sets/list";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecord } from "@/hooks/use-data";

const SetsOverview = ({ recordId }: { recordId: string }) => {
  const { record, error, isLoading, mutate } = useRecord(recordId);
  if (error) return <ServerErrorState onRetry={() => mutate()} />;
  if (isLoading || !record) return <MatchSetsSkeleton />;

  return (
    <Card className="w-full">
      <Header title="各局紀錄" url={`/match/${recordId}`} />
      <Teams recordId={recordId} />
      <SetsList recordId={recordId} />
    </Card>
  );
};

export function MatchSetsSkeleton() {
  return (
    <Card className="w-full">
      <div className="flex items-center justify-between p-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-5" />
      </div>
      <div className="flex justify-between px-4 pb-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="space-y-1 px-4 pb-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export default SetsOverview;
