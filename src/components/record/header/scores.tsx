"use client";
import { Figure } from "@/components/custom/stats/figures";
import { useRecord } from "@/hooks/use-data";
import { useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { MdOutlineSportsVolleyball } from "react-icons/md";

export const Scores = ({
  recordId,
  onClick,
}: {
  recordId: string;
  onClick: () => void;
}) => {
  const { record } = useRecord(recordId);
  const { scores, isSetPoint } = useAppSelector(
    (state) => state.record.general.status,
  );
  const isHomeSetPoint = isSetPoint && scores.home > scores.away;
  const isAwaySetPoint = isSetPoint && scores.away > scores.home;

  return (
    <div
      className="flex h-21 flex-1 flex-row items-center justify-center gap-2"
      onClick={onClick}
    >
      <Container className="border-primary">
        <Figure
          value={scores.home}
          size="lg"
          variant={isHomeSetPoint ? "primary" : "default"}
          className="h-14 w-18 font-bold"
        />
        <Team>{record?.teams?.home?.name || "我方"}</Team>
      </Container>
      <div className="flex h-20 w-16 flex-col items-center justify-center [&>svg]:size-12">
        <MdOutlineSportsVolleyball />
        <div className="flex h-5 flex-row gap-1 text-[1.25rem] leading-none font-bold">
          <div>{record?.sets.filter((set) => set.win === true).length}</div>-
          <div>{record?.sets.filter((set) => set.win === false).length}</div>
        </div>
      </div>
      <Container className="border-destructive">
        <Figure
          value={scores.away}
          size="lg"
          variant={isAwaySetPoint ? "destructive" : "default"}
          className="h-14 w-18 font-bold"
        />
        <Team>{record?.teams?.away?.name || "對手"}</Team>
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
        "flex h-21 w-18 flex-col items-center justify-center gap-1 border-b-4 text-[3rem] leading-none font-bold",
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
