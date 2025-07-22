"use client";
import LoadingCard from "@/components/custom/loading/card";
import LoadingCourt from "@/components/custom/loading/court";
import { StatsForOneSet } from "@/components/match/stats";
import { RecordCourt } from "@/components/record/court";
import { RecordHeader } from "@/components/record/header";
import { RecordOptions } from "@/components/record/options";
import { RecordOptionsSummary } from "@/components/record/options/summary";
import { RecordPanels } from "@/components/record/panels";
import { RecordPreview } from "@/components/record/preview";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { useRecord } from "@/hooks/use-data";
import { recordActions } from "@/lib/features/record/record-slice";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useEffect, useState } from "react";

const Record = ({
  recordId,
  setIndex,
}: {
  recordId: string;
  setIndex: number;
}) => {
  const { record, isLoading, error } = useRecord(recordId);
  const dispatch = useAppDispatch();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState("overview");
  const { _id, general } = useAppSelector((state) => state.record);

  const handleOptionOpen = (tabValue: string) => {
    dispatch(recordActions.initialize({ record, setIndex }));
    setTabValue(tabValue);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (record) dispatch(recordActions.initialize({ record, setIndex }));
  }, [recordId, setIndex, record, dispatch]);

  if (error) throw error;
  if (isLoading || _id !== recordId) {
    return (
      <div className="flex size-full max-w-[640px] flex-col items-center justify-start gap-1 overflow-hidden">
        <RecordHeader />
        <LoadingCourt />
        <Card className="grid w-full p-2">
          <div className="h-8 rounded-md bg-muted motion-safe:animate-pulse" />
        </Card>
        <LoadingCard className="w-full flex-1 pb-4" />
      </div>
    );
  }

  if (!general.status.inProgress) {
    return <Interval recordId={recordId} setIndex={setIndex} />;
  }

  return (
    <div className="flex size-full max-w-[640px] flex-col items-center justify-start gap-1 overflow-hidden">
      <RecordHeader recordId={recordId} handleOptionOpen={handleOptionOpen} />
      <RecordCourt recordId={recordId} mode="general" />
      <RecordPreview
        recordId={recordId}
        mode="general"
        handleOptionOpen={handleOptionOpen}
      />
      <RecordPanels
        recordId={recordId}
        mode="general"
        className="pb-[max(calc(env(safe-area-inset-bottom)-1rem),1.5rem)]"
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <RecordOptions
          recordId={recordId}
          tabValue={tabValue}
          setTabValue={setTabValue}
        />
      </Dialog>
    </div>
  );
};

const Interval = ({
  recordId,
  setIndex,
}: {
  recordId: string;
  setIndex: number;
}) => {
  return (
    <>
      <RecordHeader recordId={recordId} handleOptionOpen={() => {}} />
      <Accordion
        type="single"
        defaultValue="stats"
        collapsible
        className="w-full pb-[calc(env(safe-area-inset-bottom)+5.5rem)]"
      >
        <AccordionItem value="stats" className="w-full bg-card">
          <AccordionTrigger className="w-full p-4">數據統計</AccordionTrigger>
          <AccordionContent className="flex w-full flex-col items-center justify-center gap-4">
            <StatsForOneSet recordId={recordId} setIndex={setIndex} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="summary" className="w-full bg-card">
          <AccordionTrigger className="w-full p-4">逐球紀錄</AccordionTrigger>
          <AccordionContent className="h-full w-full px-4">
            <RecordOptionsSummary recordId={recordId} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] w-full px-4">
        <Button size="lg" className="w-full">
          新的一局
        </Button>
      </div>
    </>
  );
};

export default Record;
