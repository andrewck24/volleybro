"use client";
import { Figure } from "@/components/custom/stats/figures";
import { SetOptions } from "@/components/game/set-options";
import { SetEdit } from "@/components/game/sets/edit";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useGame } from "@/hooks/use-data";
import { gameActions } from "@/lib/features/game/game-slice";
import { getPreviousRally } from "@/lib/features/game/helpers";
import type { SetView } from "@/lib/features/game/types";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  RiAddLine,
  RiArrowRightLine,
  RiListCheck,
  RiMoreLine,
} from "react-icons/ri";

export const SetsList = ({ gameId }: { gameId: string }) => {
  const dispatch = useAppDispatch();
  const { game } = useGame(gameId);
  const [setIndex, setSetIndex] = useState<number>(0);
  const [optionsOpen, setOptionsOpen] = useState<boolean>(false);
  const [editOpen, setEditOpen] = useState<boolean>(false);

  const handleOptionsOpen = (setIndex: number) => {
    setSetIndex(setIndex);
    setOptionsOpen(true);
  };

  const handleEditOpen = (setIndex: number) => {
    dispatch(gameActions.initialize({ game: game!, setIndex }));
    setSetIndex(setIndex);
    setEditOpen(true);
  };

  return (
    <>
      <Accordion type="single" collapsible className="flex flex-col gap-2">
        {game?.sets.map((set, index) => (
          <SetItem
            key={index}
            gameId={gameId}
            set={set}
            setIndex={index}
            handleOptionsOpen={handleOptionsOpen}
            handleEditOpen={handleEditOpen}
          />
        ))}
      </Accordion>
      <Button size="lg" onClick={() => handleOptionsOpen(game!.sets.length)}>
        <RiAddLine />
        新增一局
      </Button>
      <Dialog open={optionsOpen} onOpenChange={setOptionsOpen}>
        <SetOptions gameId={gameId} setIndex={setIndex} />
      </Dialog>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <SetEdit gameId={gameId} setIndex={setIndex} />
      </Dialog>
    </>
  );
};

const SetItem = ({
  gameId,
  set,
  setIndex,
  handleOptionsOpen,
  handleEditOpen,
}: {
  gameId: string;
  set: SetView;
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
      <AccordionTrigger className="flex flex-1 items-center justify-center gap-2 border-0 p-4 hover:bg-muted/50 [&>svg]:size-6">
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
              onClick={() =>
                router.push(`/game/${gameId}/sets/${setIndex}/entry`)
              }
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
