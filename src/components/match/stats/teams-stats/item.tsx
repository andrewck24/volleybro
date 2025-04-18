import { MoveType } from "@/entities/record";
import type { ITeamsStats } from "@/lib/features/record/types";
import { cn } from "@/lib/utils";

interface IFigures {
  home: number;
  away: number;
}

export const StatsItem = ({
  title,
  type,
  success,
  stats,
}: {
  title: string;
  type: MoveType;
  success: boolean;
  stats: ITeamsStats;
}) => {
  const figures = success
    ? {
        home: stats.home[type].success,
        away: stats.away[type].success,
      }
    : {
        home: stats.home[type].error,
        away: stats.away[type].error,
      };

  return (
    <div className="flex w-full flex-col items-center justify-center gap-1">
      <Figures title={title} figures={figures} />
      <BarChart figures={figures} />
    </div>
  );
};

export const TotalStatsItem = ({
  title,
  types,
  success,
  stats,
}: {
  title: string;
  types: MoveType[];
  success: boolean;
  stats: ITeamsStats;
}) => {
  const figures = {
    home: types.reduce((total, type) => {
      return success
        ? total + stats.home[type].success
        : total + stats.home[type].error;
    }, 0),
    away: types.reduce((total, type) => {
      return success
        ? total + stats.away[type].success
        : total + stats.away[type].error;
    }, 0),
  };

  return (
    <div className="flex w-full flex-col items-center justify-center gap-1">
      <Figures
        title={title}
        figures={figures}
        className="font-bold text-primary"
      />
      <BarChart figures={figures} />
    </div>
  );
};

export const CountItem = ({
  title,
  type,
  stats,
}: {
  title: string;
  type: "rotation" | "timeout" | "substitution" | "challenge";
  stats: ITeamsStats;
}) => {
  const figures = {
    home: stats.home[type],
    away: stats.away[type],
  };

  return (
    <div className="flex w-full flex-col items-center justify-center gap-1">
      <Figures title={title} figures={figures} />
    </div>
  );
};

const Figures = ({
  title,
  figures,
  className,
}: {
  title: string;
  figures: IFigures;
  className?: string;
}) => {
  const isHomeLarger = figures.home > figures.away;
  const isAwayLarger = figures.away > figures.home;

  return (
    <div
      className={cn(
        "flex w-full flex-row items-center justify-center gap-2 font-medium",
        className,
      )}
    >
      <Figure figure={figures.home} isLarger={isHomeLarger} isHome={true} />
      <span className="flex flex-1 items-center justify-center">{title}</span>
      <Figure figure={figures.away} isLarger={isAwayLarger} isHome={false} />
    </div>
  );
};

const Figure = ({
  figure,
  isLarger,
  isHome,
}: {
  figure: number;
  isLarger: boolean;
  isHome: boolean;
}) => {
  return (
    <div
      className={cn(
        "flex size-15 items-center justify-center rounded-lg bg-accent px-1 text-[2rem] font-medium",
        !isLarger
          ? "text-muted-foreground"
          : isHome
            ? "text-primary"
            : "text-destructive",
      )}
    >
      {figure}
    </div>
  );
};

const BarChart = ({ figures }: { figures: IFigures }) => {
  const total = figures.home + figures.away;
  const homeScale = total === 0 ? 0 : (figures.home / total) * 2;
  const awayScale = total === 0 ? 0 : (figures.away / total) * 2;

  return (
    <div
      className="grid h-2 w-full overflow-hidden rounded bg-accent"
      style={{ gridTemplateColumns: "1fr 1fr" }}
    >
      <div
        className={cn("origin-left bg-primary transition-all")}
        style={{ transform: `scaleX(${homeScale})` }}
      />
      <div
        className={cn("origin-right bg-destructive transition-all")}
        style={{ transform: `scaleX(${awayScale})` }}
      />
    </div>
  );
};
