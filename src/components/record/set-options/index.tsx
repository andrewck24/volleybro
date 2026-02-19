"use client";
import { SetOptionsPanel } from "@/components/record/set-options/panel";
import { LineupCourt } from "@/components/team/lineup/court";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRecord } from "@/hooks/use-data";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useEffect } from "react";

export const SetOptions = ({
  recordId,
  setIndex,
}: {
  recordId: string;
  setIndex: number;
}) => {
  const dispatch = useAppDispatch();
  const { record } = useRecord(recordId);

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
      <LineupCourt players={record.teams.home.players} />
      <SetOptionsPanel recordId={recordId} />
    </DialogContent>
  );
};
