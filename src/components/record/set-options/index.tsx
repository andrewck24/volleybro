"use client";
import { SetOptionsPanels } from "@/components/record/set-options/panels";
import { LineupCourt } from "@/components/team/lineup/court";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRecord } from "@/hooks/use-data";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useEffect } from "react";

export const SetOptions = ({ recordId }: { recordId: string }) => {
  const dispatch = useAppDispatch();
  const { record } = useRecord(recordId);
  const { setIndex } = useAppSelector(
    (state) => state.record[state.record.mode].status,
  );

  useEffect(() => {
    const lineup =
      record?.sets[setIndex]?.lineups?.home || record.teams.home.lineup;
    dispatch(lineupActions.initialize([lineup]));
  }, [record, setIndex, dispatch]);

  return (
    <DialogContent size="lg">
      <DialogHeader>
        <DialogTitle className="pb-2 text-center font-medium">
          第 {setIndex + 1} 局設定
        </DialogTitle>
        <DialogDescription className="sr-only">
          設定第 {setIndex + 1} 局的陣容
        </DialogDescription>
      </DialogHeader>
      <LineupCourt members={record.teams.home.players} />
      <SetOptionsPanels recordId={recordId} />
    </DialogContent>
  );
};
