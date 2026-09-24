"use client";
import { Points } from "@/components/game/stats/teams-stats/points";
import { getTeamsStats } from "@/lib/features/game/helpers";
import type { GameView, ITeamsStats } from "@/lib/features/game/types";
import { useMemo } from "react";

export const TeamsStats = ({
  sets,
  setIndex,
}: {
  sets: GameView["sets"];
  setIndex: number;
}) => {
  const teamsStats = useMemo<ITeamsStats>(
    () => getTeamsStats({ sets }, setIndex),
    [sets, setIndex],
  );

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4">
      <Points stats={teamsStats} />
    </div>
  );
};
