"use client";
import { Points } from "@/components/match/stats/teams-stats/points";
import { type Record, TeamStats } from "@/entities/record";
import type { ITeamsStats } from "@/lib/features/record/types";
import { useMemo } from "react";

export const TeamsStats = ({
  teams,
  setIndex,
}: {
  teams: Record["teams"];
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
  teams: Record["teams"],
  setIndex: number,
): ITeamsStats => {
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
  if (statsArr.length === 0) return {} as TeamStats;

  return statsArr.reduce((acc, stats) => {
    for (const key in stats) {
      if (typeof stats[key] === "object" && stats[key] !== null) {
        acc[key] = acc[key] || { success: 0, error: 0 };
        acc[key].success += stats[key].success;
        acc[key].error += stats[key].error;
      } else if (typeof stats[key] === "number") {
        acc[key] = (acc[key] || 0) + stats[key];
      }
    }
    return acc;
  }, {} as TeamStats);
};
