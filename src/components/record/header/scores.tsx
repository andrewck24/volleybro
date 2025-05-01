"use client";
import { useRecord } from "@/hooks/use-data";
import { useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { MdOutlineSportsVolleyball } from "react-icons/md";

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
        "flex h-20 w-16 flex-col items-center justify-center text-[3rem] leading-none font-bold [&>svg]:size-12",
        className,
      )}
    >
      {children}
    </div>
  );
};

const Team = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex w-full max-w-16 items-center justify-center overflow-hidden text-[1rem] font-medium text-ellipsis whitespace-nowrap">
      {children}
    </div>
  );
};

// TODO: 使用 `Figure` 重構
export const Scores = ({ recordId, ...props }) => {
  const { record } = useRecord(recordId);
  const { scores } = useAppSelector((state) => state.record.general.status);
  // TODO: Add set-point styles

  return (
    <div
      className="flex min-h-[3rem] flex-1 flex-row items-center justify-center gap-2 text-[1.625rem] font-medium"
      {...props}
    >
      <Container
        className={cn(
          "border-b-4 border-primary",
          // isSetPoint &&
          //   scores.home > scores.away &&
          //   "bg-primary text-primary-foreground"
        )}
      >
        {scores.home}
        <Team>{record?.teams?.home?.name || "我方"}</Team>
      </Container>
      <Container>
        <MdOutlineSportsVolleyball />
        <div className="flex h-5 flex-row gap-1 text-[1.25rem] leading-none">
          <div>{record?.sets.filter((set) => set.win === true).length}</div>-
          <div>{record?.sets.filter((set) => set.win === false).length}</div>
        </div>
      </Container>
      <Container
        className={cn(
          "border-b-4 border-destructive",
          // isSetPoint &&
          //   scores.away > scores.home &&
          //   "bg-destructive text-destructive-foreground"
        )}
      >
        {scores.away}
        <Team>{record?.teams?.away?.name || "對手"}</Team>
      </Container>
    </div>
  );
};

export default Scores;
