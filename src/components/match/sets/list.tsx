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
import { useState } from "react";
import { RiAddLine, RiArrowRightWideLine } from "react-icons/ri";

export const SetsList = ({ recordId }: { recordId: string }) => {
  const { record } = useRecord(recordId);
  const dispatch = useAppDispatch();
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const handleDialogOpen = (index: number) => {
    dispatch(recordActions.setSetIndex(index));
    setDialogOpen(true);
  };

  return (
    <>
      {record?.sets.map((set, index) => (
        <SetInfo
          key={index}
          set={set}
          index={index}
          handleDialogOpen={handleDialogOpen}
        />
      ))}
      <Button size="lg" onClick={() => handleDialogOpen(record.sets.length)}>
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
  set,
  index,
  handleDialogOpen,
}: {
  set: Set;
  index: number;
  handleDialogOpen: (index: number) => void;
}) => {
  const rally = getPreviousRally(set.entries, set.entries.length);

  return (
    <div
      className="flex flex-1 items-center justify-center gap-2 rounded border p-4 hover:bg-accent/80"
      onClick={() => handleDialogOpen(index)}
    >
      <Figure value={rally.home.score} />
      <span className="flex flex-1 justify-center text-lg font-semibold">{`第 ${index + 1} 局`}</span>
      <Figure value={rally.away.score} />
      <RiArrowRightWideLine className="size-6" />
    </div>
  );
};
