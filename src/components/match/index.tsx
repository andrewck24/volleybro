"use client";
import { Banner } from "@/components/match/banner";
import { Header } from "@/components/match/header";
import { Stats } from "@/components/match/stats";
import { useRecord } from "@/hooks/use-data";

const Match = ({ recordId }: { recordId: string }) => {
  const { record, error, isLoading } = useRecord(recordId);
  if (error) throw error;
  if (isLoading || !record) {
    return (
      <div>
        <h1>Loading...</h1>
      </div>
    );
  }

  return (
    <>
      <Header title="賽事總覽" url="/home" />
      <Banner recordId={recordId} />
      <Stats recordId={recordId} />
    </>
  );
};

export default Match;
