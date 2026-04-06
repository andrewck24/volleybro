"use client";
import { Points } from "@/components/match/stats/teams-stats/points";
import {
  type Game as TGame,
  type TeamStats,
  TeamStatsClass,
} from "@/entities/game";
import type { ITeamsStats } from "@/lib/features/game/types";
import { useMemo } from "react";

export const TeamsStats = ({
  teams,
  setIndex,
}: {
  teams: TGame["teams"];
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
  teams: TGame["teams"],
  setIndex: number,
): ITeamsStats => {
  if (teams.home.stats.length === 0 || teams.away.stats.length === 0) {
    return {
      home: new TeamStatsClass(),
      away: new TeamStatsClass(),
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

const sumTeamStats = (statsArr: TeamStats[]): TeamStats => {
  return statsArr.reduce((acc, stats) => {
    for (const key of Object.keys(stats) as (keyof TeamStats)[]) {
      const sv = stats[key] as StatValue;
      const av = acc[key] as StatValue | undefined;
      if (typeof sv === "object") {
        const avObj = (av as
          | { success: number; error: number }
          | undefined) ?? {
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
  }, {} as TeamStats);
};
