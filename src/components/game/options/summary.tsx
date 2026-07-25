"use client";
import { Entry } from "@/components/game/entry";
import { Separator } from "@/components/ui/separator";
import { useGame } from "@/hooks/use-data";
import { gameActions } from "@/lib/features/game/game-slice";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";

export const GameOptionsSummary = ({ gameId }: { gameId: string }) => {
  const dispatch = useAppDispatch();
  const { game } = useGame(gameId);
  const { setIndex } = useAppSelector((state) => state.game);
  const set = game!.sets[setIndex];
  const { players } = game!.teams.home;

  const handleEntryClick = (entryIndex: number) => {
    dispatch(gameActions.setEditingEntryStatus({ game: game!, entryIndex }));
  };

  return (
    <div className="flex flex-col-reverse gap-1">
      <Separator content="比賽開始" />
      {set?.entries.map((entry, entryIndex: number) => (
        <Entry
          key={entryIndex}
          entry={entry}
          players={players}
          onClick={() => handleEntryClick(entryIndex)}
        />
      ))}
    </div>
  );
};
