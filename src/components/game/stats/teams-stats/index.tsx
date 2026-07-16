"use client";
import { Points } from "@/components/game/stats/teams-stats/points";
import { MoveType } from "@/entities/game";
import type {
  GameView,
  ITeamsStats,
  TeamStatsView,
} from "@/lib/features/game/types";
import { useMemo } from "react";

export const TeamsStats = ({
  teams,
  setIndex,
}: {
  teams: GameView["teams"];
  setIndex: number;
}) => {
  const teamsStats = useMemo<ITeamsStats>(
    () => getTeamsStats(teams, setIndex),
    [teams, setIndex],
  );

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4">
      <Points stats={teamsStats} />
    </div>
  );
};

export const getTeamsStats = (
  teams: GameView["teams"],
  setIndex: number,
): ITeamsStats => {
  if (teams.home.stats.length === 0 || teams.away.stats.length === 0) {
    return {
      home: createEmptyTeamStats(),
      away: createEmptyTeamStats(),
    };
  }
  const isCalculatingAll = setIndex === -1;
  if (!isCalculatingAll) {
    return {
      home: teams.home.stats[setIndex],
      away: teams.away.stats[setIndex],
    };
  }
  return {
    home: sumTeamStats(teams.home.stats),
    away: sumTeamStats(teams.away.stats),
  };
};

type StatValue = { success: number; error: number } | number;

const sumTeamStats = (statsArr: TeamStatsView[]): TeamStatsView => {
  return statsArr.reduce((acc, stats) => {
    for (const key of Object.keys(stats) as (keyof TeamStatsView)[]) {
      const sv = stats[key] as StatValue;
      const av = acc[key] as StatValue | undefined;
      if (typeof sv === "object") {
        const avObj = (av as
          { success: number; error: number } | undefined) ?? {
          success: 0,
          error: 0,
        };
        (acc[key] as { success: number; error: number }) = {
          success: avObj.success + sv.success,
          error: avObj.error + sv.error,
        };
      } else {
        (acc[key] as number) = ((av as number | undefined) ?? 0) + sv;
      }
    }
    return acc;
  }, createEmptyTeamStats());
};

const createEmptyTeamStats = (): TeamStatsView => ({
  [MoveType.SERVING]: { success: 0, error: 0 },
  [MoveType.BLOCKING]: { success: 0, error: 0 },
  [MoveType.ATTACK]: { success: 0, error: 0 },
  [MoveType.RECEPTION]: { success: 0, error: 0 },
  [MoveType.DEFENSE]: { success: 0, error: 0 },
  [MoveType.SETTING]: { success: 0, error: 0 },
  [MoveType.UNFORCED]: { success: 0, error: 0 },
  rotation: 0,
  timeout: 2,
  substitution: 6,
  challenge: 2,
});
