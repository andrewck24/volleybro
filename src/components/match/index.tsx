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
    <main className="flex w-full flex-col items-center justify-center gap-2 pt-[calc(env(safe-area-inset-top)+3rem)]">
      <Header />
      <Banner recordId={recordId} />
      <Stats recordId={recordId} />
    </main>
  );
};

export default Match;
