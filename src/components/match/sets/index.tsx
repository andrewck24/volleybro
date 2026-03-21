"use client";
import { ServerErrorState } from "@/components/custom/error/server-error-state";
import LoadingCard from "@/components/custom/loading/card";
import { Teams } from "@/components/match/banner/teams";
import { Header } from "@/components/match/header";
import { SetsList } from "@/components/match/sets/list";
import { Card } from "@/components/ui/card";
import { useRecord } from "@/hooks/use-data";

const SetsOverview = ({ recordId }: { recordId: string }) => {
  const { record, error, isLoading, mutate } = useRecord(recordId);
  if (error) return <ServerErrorState onRetry={() => mutate()} />;
  if (isLoading || !record) return <LoadingCard />;

  return (
    <Card className="w-full">
      <Header title="各局紀錄" url={`/match/${recordId}`} />
      <Teams recordId={recordId} />
      <SetsList recordId={recordId} />
    </Card>
  );
};

export default SetsOverview;
