"use client";
// The app's `Points` rows (same order and props as
// src/components/game/stats/teams-stats/points.tsx) with zh-TW labels: `Points`
// hard-codes English and takes no label prop, and the app component stays
// untouched.
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
  const { filedRallies } = useRally();
  const stats = useMemo(
    () => statsAt(Math.max(0, filedRallies)),
    [filedRallies],
  );

  return (
    <div
      inert
      className="w-full max-lg:[&_.size-15]:size-10 max-lg:[&_.size-15]:text-2xl max-[23.75rem]:[&_.size-15]:size-8 max-[23.75rem]:[&_.size-15]:text-xl [&_.transition-all]:duration-700 [&_.transition-all]:ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:[&_.transition-all]:duration-0"
    >
      <section className="flex w-full flex-col gap-1 lg:gap-2">
        {SCORING.map((s) => (
          <StatsItem
            key={s.type}
            label={s.label}
            type={s.type}
            success={true}
            stats={stats}
          />
        ))}
        <TotalStatsItem
          label="總分"
          types={SCORING.map((s) => s.type)}
          success={true}
          stats={stats}
        />
      </section>
    </div>
  );
};
