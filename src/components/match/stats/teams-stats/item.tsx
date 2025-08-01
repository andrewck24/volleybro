import { Figures } from "@/components/custom/stats/figures";
import { MoveType } from "@/entities/record";
import type { ITeamsStats } from "@/lib/features/record/types";

export const StatsItem = ({
  label,
  type,
  success,
  stats,
}: {
  label: string;
  type: MoveType;
  success: boolean;
  stats: ITeamsStats;
}) => {
  const values = !stats?.home[type]
    ? { left: 0, right: 0 }
    : success
      ? {
          left: stats.home[type].success,
          right: stats.away[type].success,
        }
      : {
          left: stats.home[type].error,
          right: stats.away[type].error,
        };

  return <Figures label={label} values={values} />;
};

export const TotalStatsItem = ({
  label,
  types,
  success,
  stats,
}: {
  label: string;
  types: MoveType[];
  success: boolean;
  stats: ITeamsStats;
}) => {
  const values = !stats?.home
    ? { left: 0, right: 0 }
    : {
        left: types.reduce((total, type) => {
          return success
            ? total + stats.home[type].success
            : total + stats.home[type].error;
        }, 0),
        right: types.reduce((total, type) => {
          return success
            ? total + stats.away[type].success
            : total + stats.away[type].error;
        }, 0),
      };

  return (
    <Figures label={label} values={values} className="font-bold text-primary" />
  );
};

export const CountItem = ({
  label,
  type,
  stats,
}: {
  label: string;
  type: "rotation" | "timeout" | "substitution" | "challenge";
  stats: ITeamsStats;
}) => {
  const values = !stats?.home
    ? { left: 0, right: 0 }
    : {
        left: stats.home[type],
        right: stats.away[type],
      };

  return <Figures label={label} values={values} disableBarChart />;
};
