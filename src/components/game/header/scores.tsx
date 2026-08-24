"use client";
import { Figure } from "@/components/custom/stats/figures";
import { SetTally } from "@/components/game/header/set-tally";
import { SyncIndicator } from "@/components/game/header/sync-indicator";
import { useGame } from "@/hooks/use-data";
import { useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { MdOutlineSportsVolleyball } from "react-icons/md";

export const Scores = ({
  gameId,
  onClick,
}: {
  gameId: string;
  onClick: () => void;
}) => {
  const { game } = useGame(gameId);
  const { scores, isSetPoint } = useAppSelector(
    (state) => state.game.general.status,
  );
  const isHomeSetPoint = isSetPoint && scores.home > scores.away;
  const isAwaySetPoint = isSetPoint && scores.away > scores.home;
  const setsWonHome = game?.sets.filter((set) => set.win === true).length ?? 0;
  const setsWonAway = game?.sets.filter((set) => set.win === false).length ?? 0;
  const setsNeeded = game ? Math.ceil(game.info.scoring.setCount / 2) : 0;

  return (
    <div
      className="flex h-21 flex-1 flex-row items-center justify-center gap-1"
      onClick={onClick}
    >
      <Container className="border-primary">
        <Figure
          value={scores.home}
          size="lg"
          variant={isHomeSetPoint ? "primary" : "default"}
          className="h-14 w-16 font-bold"
        />
        <Team>{game?.teams?.home?.name || "我方"}</Team>
      </Container>
      <SetTally won={setsWonHome} needed={setsNeeded} side="home" />
      <div className="flex h-21 w-16 shrink-0 flex-col items-center justify-center gap-1">
        <MdOutlineSportsVolleyball className="size-12" />
        <SyncIndicator gameId={gameId} />
      </div>
      <SetTally won={setsWonAway} needed={setsNeeded} side="away" />
      <Container className="border-destructive">
        <Figure
          value={scores.away}
          size="lg"
          variant={isAwaySetPoint ? "destructive" : "default"}
          className="h-14 w-16 font-bold"
        />
        <Team>{game?.teams?.away?.name || "對手"}</Team>
      </Container>
    </div>
  );
};

const Container = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "flex h-21 w-16 shrink-0 flex-col items-center justify-center gap-1 border-b-4 text-[3rem] leading-none font-bold",
        className,
      )}
    >
      {children}
    </div>
  );
};

const Team = ({ children }: { children: React.ReactNode }) => {
  return (
    <p className="flex w-full max-w-16 items-center justify-center overflow-hidden text-[1rem] font-medium text-ellipsis whitespace-nowrap">
      {children}
    </p>
  );
};
