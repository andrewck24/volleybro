"use client";
import { Teams } from "@/components/match/banner/teams";
import { Header } from "@/components/match/header";
import { SetsList } from "@/components/match/sets/list";
import { Card } from "@/components/ui/card";
import { useRecord } from "@/hooks/use-data";

const SetsOverview = ({ recordId }: { recordId: string }) => {
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
    <Card className="w-full">
      <Header title="各局紀錄" url={`/match/${recordId}`} />
      <Teams recordId={recordId} />
      <SetsList recordId={recordId} />
    </Card>
  );
};

export default SetsOverview;
