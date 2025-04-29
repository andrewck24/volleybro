"use client";
import { Figure } from "@/components/custom/stats/figures";
import { SetOptions } from "@/components/record/set-options";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { Set } from "@/entities/record";
import { useRecord } from "@/hooks/use-data";
import { getPreviousRally } from "@/lib/features/record/helpers";
import { recordActions } from "@/lib/features/record/record-slice";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RiAddLine, RiArrowRightLine, RiMoreLine } from "react-icons/ri";

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
      <Accordion type="single" collapsible className="flex flex-col gap-2">
        {record?.sets.map((set, index) => (
          <SetItem
            key={index}
            recordId={recordId}
            set={set}
            setIndex={index}
            handleOptionsOpen={handleOptionsOpen}
          />
        ))}
      </Accordion>
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

const SetItem = ({
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
    <AccordionItem
      value={setIndex.toString()}
      className="rounded-md border last:border"
    >
      <AccordionTrigger className="flex flex-1 items-center justify-center gap-2 border-0 p-4 hover:bg-accent/80 [&>svg]:size-6">
        <Figure value={rally ? rally.home.score : 0} />
        <span className="flex flex-1 justify-center text-lg">{`第 ${setIndex + 1} 局`}</span>
        <Figure value={rally ? rally.away.score : 0} />
      </AccordionTrigger>
      <AccordionContent className="p-2">
        <div className="grid w-full grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleOptionsOpen(setIndex)}
          >
            <RiMoreLine className="size-6" />
            檢視設定
          </Button>
          <Button
            size="lg"
            onClick={() => router.push(`/record/${recordId}?si=${setIndex}`)}
          >
            進入比賽
            <RiArrowRightLine className="size-6" />
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
