"use client";
import { EntriesEdit } from "@/components/record/options/edit";
import { RecordOptionsSummary } from "@/components/record/options/summary";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import { useAppSelector } from "@/lib/redux/hooks";
import { DialogTitle } from "@radix-ui/react-dialog";

export const SetEdit = ({
  recordId,
  setIndex,
}: {
  recordId: string;
  setIndex: number;
}) => {
  const { mode } = useAppSelector((state) => state.record);

  return (
    <DialogContent size="lg" closeButton={mode === "general"}>
      {mode === "general" ? (
        <>
          <DialogHeader>
            <DialogTitle>第 {setIndex + 1} 局逐球記錄</DialogTitle>
            <DialogDescription className="sr-only">
              逐球紀錄頁面
            </DialogDescription>
          </DialogHeader>
          <RecordOptionsSummary recordId={recordId} />
        </>
      ) : (
        <EntriesEdit recordId={recordId} />
      )}
    </DialogContent>
  );
};
