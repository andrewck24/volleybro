"use client";
import { MoveType } from "@/entities/record";
import { useRecord } from "@/hooks/use-data";
import { useAppSelector } from "@/lib/redux/hooks";

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

const RecordOptionsOverview = ({ recordId }: { recordId: string }) => {
  const { record } = useRecord(recordId);
  const { setIndex } = useAppSelector((state) => state.record);
  const { home, away } = record.teams;

  return (
    <>
      <StatsRow>
        <StatsCell>我方</StatsCell>
        <StatsCell></StatsCell>
        <StatsCell>對方</StatsCell>
      </StatsRow>
      <StatsRow>
        <StatsCell>{home.stats[setIndex][MoveType.ATTACK].success}</StatsCell>
        <StatsCell>ATTACKS</StatsCell>
        <StatsCell>{away.stats[setIndex][MoveType.ATTACK].success}</StatsCell>
      </StatsRow>
      <StatsRow>
        <StatsCell>{home.stats[setIndex][MoveType.BLOCKING].success}</StatsCell>
        <StatsCell>BLOCKS</StatsCell>
        <StatsCell>{away.stats[setIndex][MoveType.BLOCKING].success}</StatsCell>
      </StatsRow>
      <StatsRow>
        <StatsCell>{home.stats[setIndex][MoveType.SERVING].success}</StatsCell>
        <StatsCell>SERVES</StatsCell>
        <StatsCell>{away.stats[setIndex][MoveType.SERVING].success}</StatsCell>
      </StatsRow>
      <StatsRow>
        <StatsCell>{home.stats[setIndex][MoveType.UNFORCED].success}</StatsCell>
        <StatsCell>OPPO_ERRORS</StatsCell>
        <StatsCell>{away.stats[setIndex][MoveType.UNFORCED].success}</StatsCell>
      </StatsRow>
    </>
  );
};

export default RecordOptionsOverview;
