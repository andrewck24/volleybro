"use client";
import { Figure } from "@/components/custom/stats/figures";
import { SetEdit } from "@/components/match/sets/edit";
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
import {
  RiAddLine,
  RiArrowRightLine,
  RiListCheck,
  RiMoreLine,
} from "react-icons/ri";

export const SetsList = ({ recordId }: { recordId: string }) => {
  const dispatch = useAppDispatch();
  const { record } = useRecord(recordId);
  const [setIndex, setSetIndex] = useState<number>(0);
  const [optionsOpen, setOptionsOpen] = useState<boolean>(false);
  const [editOpen, setEditOpen] = useState<boolean>(false);

  const handleOptionsOpen = (setIndex: number) => {
    setSetIndex(setIndex);
    setOptionsOpen(true);
  };

  const handleEditOpen = (setIndex: number) => {
    dispatch(recordActions.initialize({ record: record!, setIndex }));
    setSetIndex(setIndex);
    setEditOpen(true);
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
            handleEditOpen={handleEditOpen}
          />
        ))}
      </Accordion>
      <Button size="lg" onClick={() => handleOptionsOpen(record!.sets.length)}>
        <RiAddLine />
        新增一局
      </Button>
      <Dialog open={optionsOpen} onOpenChange={setOptionsOpen}>
        <SetOptions recordId={recordId} setIndex={setIndex} />
      </Dialog>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <SetEdit recordId={recordId} setIndex={setIndex} />
      </Dialog>
    </>
  );
};

const SetItem = ({
  recordId,
  set,
  setIndex,
  handleOptionsOpen,
  handleEditOpen,
}: {
  recordId: string;
  set: Set;
  setIndex: number;
  handleOptionsOpen: (setIndex: number) => void;
  handleEditOpen: (setIndex: number) => void;
}) => {
  const router = useRouter();
  const rally = getPreviousRally(set.entries, set.entries.length);
  const isFinished = typeof set.win === "boolean";

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
          {isFinished ? (
            <Button size="lg" onClick={() => handleEditOpen(setIndex)}>
              <RiListCheck className="size-6" />
              查看紀錄
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={() => router.push(`/record/${recordId}?si=${setIndex}`)}
            >
              進入比賽
              <RiArrowRightLine className="size-6" />
            </Button>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
