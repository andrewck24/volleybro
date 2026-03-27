"use client";
import { Points } from "@/components/match/stats/teams-stats/points";
import {
  type Record as TRecord,
  type TeamStats,
  TeamStatsClass,
} from "@/entities/record";
import type { ITeamsStats } from "@/lib/features/record/types";
import { useMemo } from "react";

export const TeamsStats = ({
  teams,
  setIndex,
}: {
  teams: TRecord["teams"];
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
  teams: TRecord["teams"],
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

const sumTeamStats = (statsArr: TeamStats[]): TeamStats => {
  return statsArr.reduce((acc, stats) => {
    const s = stats as Record<string, unknown>;
    const a = acc as Record<string, unknown>;
    for (const key in s) {
      if (typeof s[key] === "object" && s[key] !== null) {
        const sv = s[key] as { success: number; error: number };
        const av = (a[key] as
          | { success: number; error: number }
          | undefined) ?? { success: 0, error: 0 };
        a[key] = {
          success: av.success + sv.success,
          error: av.error + sv.error,
        };
      } else if (typeof s[key] === "number") {
        a[key] = ((a[key] as number | undefined) ?? 0) + (s[key] as number);
      }
    }
    return acc;
  }, {} as TeamStats);
};
