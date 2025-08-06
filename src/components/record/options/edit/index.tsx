"use client";
import { RecordCourt } from "@/components/record/court";
import { RecordPanel } from "@/components/record/panel";
import { RecordPreview } from "@/components/record/preview";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { recordActions } from "@/lib/features/record/record-slice";
import { useAppDispatch } from "@/lib/redux/hooks";
import { RiArrowLeftWideLine } from "react-icons/ri";

export const EntriesEdit = ({ recordId }: { recordId: string }) => {
  const dispatch = useAppDispatch();

  return (
    <>
      <DialogHeader className="flex-row items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => dispatch(recordActions.setRecordMode("general"))}
        >
          <RiArrowLeftWideLine />
          <span className="sr-only">back</span>
        </Button>
        <DialogTitle>編輯逐球紀錄</DialogTitle>
        <DialogDescription className="sr-only">
          逐球紀錄編輯頁面
        </DialogDescription>
      </DialogHeader>
      <RecordCourt recordId={recordId} mode="editing" />
      <RecordPreview
        recordId={recordId}
        mode="editing"
        className="px-0 py-1 shadow-none"
      />
      <RecordPanel
        recordId={recordId}
        mode="editing"
        className="p-0 shadow-none"
      />
    </>
  );
};
