"use client";
import LoadingCard from "@/components/custom/loading/card";
import LoadingCourt from "@/components/custom/loading/court";
import { RecordCourt } from "@/components/record/court";
import { RecordHeader } from "@/components/record/header";
import { RecordOptions } from "@/components/record/options";
import { RecordPanels } from "@/components/record/panels";
import { RecordPreview } from "@/components/record/preview";
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
  const { _id } = useAppSelector((state) => state.record);

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
      <>
        <RecordHeader />
        <LoadingCourt />
        <Card className="grid w-full p-2">
          <div className="h-8 rounded-md bg-muted motion-safe:animate-pulse" />
        </Card>
        <LoadingCard className="w-full flex-1 pb-4" />
      </>
    );
  }

  return (
    <>
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
    </>
  );
};

export default Record;
