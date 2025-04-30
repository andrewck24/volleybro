"use client";
import EntriesEdit from "@/components/record/options/edit";
import RecordOptionsOverview from "@/components/record/options/overview";
import RecordOptionsSummary from "@/components/record/options/summary";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { recordActions } from "@/lib/features/record/record-slice";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";

const RecordOptions = ({
  recordId,
  tabValue,
  setTabValue,
}: {
  recordId: string;
  tabValue: string;
  setTabValue: (value: string) => void;
}) => {
  const dispatch = useAppDispatch();
  const { mode } = useAppSelector((state) => state.record);

  return (
    <DialogContent
      size="lg"
      closeButton={mode === "general"}
      onCloseAutoFocus={() => dispatch(recordActions.setRecordMode("general"))}
    >
      {mode === "editing" ? (
        <EntriesEdit recordId={recordId} />
      ) : (
        <>
          <DialogHeader>
            <DialogTitle>
              {tabValue === "overview" && "數據總覽"}
              {tabValue === "summary" && "逐球紀錄"}
              {tabValue === "settings" && "賽事資訊與設定"}
            </DialogTitle>
            <DialogDescription className="sr-only">Options</DialogDescription>
          </DialogHeader>
          <Tabs value={tabValue} onValueChange={setTabValue}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">總覽</TabsTrigger>
              <TabsTrigger value="summary">紀錄</TabsTrigger>
              <TabsTrigger value="settings">設定</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="flex-1">
              <RecordOptionsOverview recordId={recordId} />
            </TabsContent>
            <TabsContent value="summary" className="h-full flex-1">
              <RecordOptionsSummary recordId={recordId} />
            </TabsContent>
            <TabsContent value="settings" className="flex-1">
              <div>設定</div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </DialogContent>
  );
};

export default RecordOptions;
