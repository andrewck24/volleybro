import {
  StatsItem,
  TotalStatsItem,
} from "@/components/match/stats/teams-stats/item";
import { MoveType } from "@/entities/record";
import type { ITeamsStats } from "@/lib/features/record/types";

export const Points = ({ stats }: { stats: ITeamsStats }) => {
  return (
    <section className="flex w-full flex-col gap-2">
      <StatsItem
        label="ATTACK"
        type={MoveType.ATTACK}
        success={true}
        stats={stats}
      />
      <StatsItem
        label="BLOCK"
        type={MoveType.BLOCKING}
        success={true}
        stats={stats}
      />
      <StatsItem
        label="SERVE"
        type={MoveType.SERVING}
        success={true}
        stats={stats}
      />
      <StatsItem
        label="OPPONENT ERROR"
        type={MoveType.UNFORCED}
        success={true}
        stats={stats}
      />
      <TotalStatsItem
        label="TOTAL"
        types={[
          MoveType.ATTACK,
          MoveType.BLOCKING,
          MoveType.SERVING,
          MoveType.UNFORCED,
        ]}
        success={true}
        stats={stats}
      />
    </section>
  );
};
