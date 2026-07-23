"use client";
import { SetOptionsPanel } from "@/components/game/set-options/panel";
import { LineupCourt } from "@/components/team/lineup/court";
import {
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGame } from "@/hooks/use-data";
import { getSetLineup } from "@/lib/features/game/helpers";
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
    const lineup = getSetLineup(game, setIndex);
    if (lineup) dispatch(lineupActions.initialize([lineup]));
  }, [game, setIndex, dispatch]);

  return (
    <DialogContent size="lg">
      <DialogHeader>
        <DialogTitle className="pb-2 text-center font-medium">
          第 {setIndex + 1} 局設定
        </DialogTitle>
        <DialogDescription srOnly>
          設定第 {setIndex + 1} 局的陣容
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
        <LineupCourt players={game?.teams.home.players ?? []} />
        <SetOptionsPanel gameId={gameId} />
      </DialogBody>
    </DialogContent>
  );
};
