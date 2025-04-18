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
        title="ATTACK"
        type={MoveType.ATTACK}
        success={true}
        stats={stats}
      />
      <StatsItem
        title="BLOCK"
        type={MoveType.BLOCKING}
        success={true}
        stats={stats}
      />
      <StatsItem
        title="SERVE"
        type={MoveType.SERVING}
        success={true}
        stats={stats}
      />
      <StatsItem
        title="OPPONENT ERROR"
        type={MoveType.UNFORCED}
        success={true}
        stats={stats}
      />
      <TotalStatsItem
        title="TOTAL"
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
