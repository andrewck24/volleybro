"use client";
import { GameCourt } from "@/components/game/court";
import { GamePanel } from "@/components/game/panel";
import { GamePreview } from "@/components/game/preview";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { gameActions } from "@/lib/features/game/game-slice";
import { useAppDispatch } from "@/lib/redux/hooks";
import { RiArrowLeftWideLine } from "react-icons/ri";

export const EntriesEdit = ({ gameId }: { gameId: string }) => {
  const dispatch = useAppDispatch();

  return (
    <>
      <DialogHeader className="flex-row items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => dispatch(gameActions.setGameMode("general"))}
        >
          <RiArrowLeftWideLine />
          <span className="sr-only">back</span>
        </Button>
        <DialogTitle>編輯逐球紀錄</DialogTitle>
        <DialogDescription srOnly>逐球紀錄編輯頁面</DialogDescription>
      </DialogHeader>
      <GameCourt gameId={gameId} mode="editing" />
      <GamePreview
        gameId={gameId}
        mode="editing"
        className="px-0 py-1 shadow-none"
      />
      <GamePanel gameId={gameId} mode="editing" className="p-0 shadow-none" />
    </>
  );
};
