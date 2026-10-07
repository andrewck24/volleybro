"use client";
// The stats section's live panel: the app's `Points`
// rows (StatsItem / TotalStatsItem, same order and props as
// src/components/game/stats/teams-stats/points.tsx) with zh-TW labels —
// `Points` hard-codes English labels and takes no label prop, so the app
// component stays untouched. The numbers follow the hero's rally clock: each
// beat the counts are derived from the rallies the hero has filed so far in
// the current set (reset with the set), and the bars run their own scaleX
// transition. Off-screen / hidden tab / reduced motion come from the clock.
// Loaded lazily (lazy-stats.tsx); only this panel subscribes to the clock.
import {
  StatsItem,
  TotalStatsItem,
} from "@/components/game/stats/teams-stats/item";
import { SET_RALLIES, foldRallies } from "@/components/landing/demo-data";
import { useRally } from "@/components/landing/rally";
import { EntryType, MoveType } from "@/entities/game";
import { getTeamsStats } from "@/lib/features/game/helpers/queries/team-stats.helper";
import type { GameView, ITeamsStats } from "@/lib/features/game/types";
import { scoringMoves } from "@/lib/scoring-moves";
import { useMemo } from "react";

const SCORING = [
  { label: "攻擊", type: MoveType.ATTACK },
  { label: "攔網", type: MoveType.BLOCKING },
  { label: "發球", type: MoveType.SERVING },
  { label: "對方失誤", type: MoveType.UNFORCED },
];

type Entries = GameView["sets"][number]["entries"];

// every prefix of the demo set as Entries, folded once
const ALL: Entries = foldRallies(SET_RALLIES).map((r, seq) => ({
  type: EntryType.RALLY,
  id: `live-${seq}`,
  seq,
  win: r.win,
  home: {
    score: r.homeScore,
    type: scoringMoves[r.home]!.type,
    num: r.home,
    player: { id: r.player, zone: 4 },
  },
  away: {
    score: r.awayScore,
    type: scoringMoves[r.away]!.type,
    num: r.away,
  },
}));

const statsAt = (n: number): ITeamsStats =>
  getTeamsStats(
    { sets: [{ entries: ALL.slice(0, n) }] as GameView["sets"] },
    0,
  );

export const LiveStats = () => {
  const { set, live } = useRally();
  // the hero files rally n into its list one beat after it lands; the panel
  // counts what the list (and the net-post score) shows
  const shown = live ? set.rallies - 1 : set.rallies;
  const stats = useMemo(() => statsAt(Math.max(0, shown)), [shown]);

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
