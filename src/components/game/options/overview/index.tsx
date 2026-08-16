"use client";
import { MoveType } from "@/entities/game";
import { useAppSelector } from "@/lib/redux/hooks";

export const GameOptionsOverview = ({
  gameId: _gameId,
}: {
  gameId: string;
}) => {
  const {
    stats: { home: homeStats, away: awayStats },
  } = useAppSelector((state) => state.game.general.status);

  return (
    <>
      <StatsRow>
        <StatsCell>我方</StatsCell>
        <StatsCell></StatsCell>
        <StatsCell>對方</StatsCell>
      </StatsRow>
      <StatsRow>
        <StatsCell>{homeStats[MoveType.ATTACK].success}</StatsCell>
        <StatsCell>ATTACKS</StatsCell>
        <StatsCell>{awayStats[MoveType.ATTACK].success}</StatsCell>
      </StatsRow>
      <StatsRow>
        <StatsCell>{homeStats[MoveType.BLOCKING].success}</StatsCell>
        <StatsCell>BLOCKS</StatsCell>
        <StatsCell>{awayStats[MoveType.BLOCKING].success}</StatsCell>
      </StatsRow>
      <StatsRow>
        <StatsCell>{homeStats[MoveType.SERVING].success}</StatsCell>
        <StatsCell>SERVES</StatsCell>
        <StatsCell>{awayStats[MoveType.SERVING].success}</StatsCell>
      </StatsRow>
      <StatsRow>
        <StatsCell>{homeStats[MoveType.UNFORCED].success}</StatsCell>
        <StatsCell>OPPO_ERRORS</StatsCell>
        <StatsCell>{awayStats[MoveType.UNFORCED].success}</StatsCell>
      </StatsRow>
    </>
  );
};

export const StatsRow = ({ children }: { children?: React.ReactNode }) => {
  return <div className="flex w-full text-xl">{children}</div>;
};

export const StatsCell = ({ children }: { children?: React.ReactNode }) => {
  return (
    <div className="flex flex-1 items-center justify-center text-wrap">
      {children}
    </div>
  );
};
