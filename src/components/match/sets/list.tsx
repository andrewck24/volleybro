"use client";
import { Figure } from "@/components/custom/stats/figures";
import { SetOptions } from "@/components/record/set-options";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { Set } from "@/entities/record";
import { useRecord } from "@/hooks/use-data";
import { getPreviousRally } from "@/lib/features/record/helpers";
import { recordActions } from "@/lib/features/record/record-slice";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RiAddLine, RiMoreLine } from "react-icons/ri";

export const SetsList = ({ recordId }: { recordId: string }) => {
  const { record } = useRecord(recordId);
  const dispatch = useAppDispatch();
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const handleOptionsOpen = (setIndex: number) => {
    dispatch(recordActions.setSetIndex(setIndex));
    setDialogOpen(true);
  };

  return (
    <>
      {record?.sets.map((set, index) => (
        <SetInfo
          key={index}
          recordId={recordId}
          set={set}
          setIndex={index}
          handleOptionsOpen={handleOptionsOpen}
        />
      ))}
      <Button size="lg" onClick={() => handleOptionsOpen(record.sets.length)}>
        <RiAddLine />
        新增一局
      </Button>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <SetOptions recordId={recordId} />
      </Dialog>
    </>
  );
};

const SetInfo = ({
  recordId,
  set,
  setIndex,
  handleOptionsOpen,
}: {
  recordId: string;
  set: Set;
  setIndex: number;
  handleOptionsOpen: (setIndex: number) => void;
}) => {
  const router = useRouter();
  const rally = getPreviousRally(set.entries, set.entries.length);

  return (
    <div className="flex flex-1 items-center justify-center gap-2 rounded border hover:bg-accent/80">
      <div
        className="flex flex-1 items-center justify-center gap-2 py-4 pl-4"
        onClick={() => router.push(`/record/${recordId}?si=${setIndex}`)}
      >
        <Figure value={rally ? rally.home.score : 0} />
        <span className="flex flex-1 justify-center text-lg font-semibold">{`第 ${setIndex + 1} 局`}</span>
        <Figure value={rally ? rally.away.score : 0} />
      </div>
      <div
        className="flex items-center justify-center gap-2 py-4 pr-4"
        onClick={() => handleOptionsOpen(setIndex)}
      >
        <RiMoreLine className="size-6" />
      </div>
    </div>
  );
};
