"use client";
import { SetOptionsPanel } from "@/components/game/set-options/panel";
import { LineupCourt } from "@/components/team/lineup/court";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGame } from "@/hooks/use-data";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useEffect } from "react";

export const SetOptions = ({
  gameId,
  setIndex,
}: {
  gameId: string;
  setIndex: number;
}) => {
  const dispatch = useAppDispatch();
  const { game } = useGame(gameId);

  useEffect(() => {
    const lineup =
      game?.sets[setIndex]?.lineups?.home ?? game?.teams.home.lineup;
    if (lineup) dispatch(lineupActions.initialize([lineup]));
  }, [game, setIndex, dispatch]);

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
      <LineupCourt players={game?.teams.home.players ?? []} />
      <SetOptionsPanel gameId={gameId} />
    </DialogContent>
  );
};
