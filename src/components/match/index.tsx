"use client";
import { ServerErrorState } from "@/components/custom/error/server-error-state";
import LoadingCard from "@/components/custom/loading/card";
import { Banner } from "@/components/match/banner";
import { Header } from "@/components/match/header";
import { Stats } from "@/components/match/stats";
import { useRecord } from "@/hooks/use-data";

const Match = ({ recordId }: { recordId: string }) => {
  const { record, error, isLoading, mutate } = useRecord(recordId);
  if (error) return <ServerErrorState onRetry={() => mutate()} />;
  if (isLoading || !record) return <LoadingCard />;

  return (
    <>
      <Header title="賽事總覽" url="/home" />
      <Banner recordId={recordId} />
      <Stats recordId={recordId} />
    </>
  );
};

export default Match;
