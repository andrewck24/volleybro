"use client";
import {
  StatsItem,
  TotalStatsItem,
} from "@/components/game/stats/teams-stats/item";
import { entriesOf } from "@/components/landing/demo-entries";
import { useRally } from "@/components/landing/rally";
import { MoveType } from "@/entities/game";
import { getTeamsStats } from "@/lib/features/game/helpers/queries/team-stats.helper";
import type { GameView, ITeamsStats } from "@/lib/features/game/types";
import { useMemo } from "react";

const SCORING = [
  { label: "攻擊", type: MoveType.ATTACK },
  { label: "攔網", type: MoveType.BLOCKING },
  { label: "發球", type: MoveType.SERVING },
  { label: "對方失誤", type: MoveType.UNFORCED },
];

const ENTRIES = entriesOf("live");

const statsAt = (n: number): ITeamsStats =>
  getTeamsStats(
    { sets: [{ entries: ENTRIES.slice(0, n) }] as GameView["sets"] },
    0,
  );

export const LiveStats = () => {
  const { recordedRallyCount } = useRally();
  const stats = useMemo(
    () => statsAt(Math.max(0, recordedRallyCount)),
    [recordedRallyCount],
  );

  return (
    <div
      inert
      className="w-full [&_[data-stat-bar]]:duration-700 [&_[data-stat-bar]]:ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:[&_[data-stat-bar]]:duration-0 max-lg:[&_[data-stat-figure]]:size-10 max-lg:[&_[data-stat-figure]]:text-2xl max-[23.75rem]:[&_[data-stat-figure]]:size-8 max-[23.75rem]:[&_[data-stat-figure]]:text-xl"
    >
      <section className="flex w-full flex-col gap-1 lg:gap-2">
        {SCORING.map((scoring) => (
          <StatsItem
            key={scoring.type}
            label={scoring.label}
            type={scoring.type}
            success={true}
            stats={stats}
          />
        ))}
        <TotalStatsItem
          label="總分"
          types={SCORING.map((scoring) => scoring.type)}
          success={true}
          stats={stats}
        />
      </section>
    </div>
  );
};
