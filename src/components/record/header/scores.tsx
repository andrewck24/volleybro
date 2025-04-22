"use client";
import { useAppSelector } from "@/lib/redux/hooks";
import { useRecord } from "@/hooks/use-data";
import { MdOutlineSportsVolleyball } from "react-icons/md";
import { cn } from "@/lib/utils";

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
        "flex flex-col items-center justify-center w-16 h-20 text-[3rem] [&>svg]:size-12 leading-none font-bold",
        className
      )}
    >
      {children}
    </div>
  );
};
const Team = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex items-center justify-center text-[1rem] font-medium w-full max-w-16 overflow-hidden whitespace-nowrap text-ellipsis">
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
      className="flex flex-row items-center justify-center flex-1 gap-2 min-h-[3rem] text-[1.625rem] font-medium"
      {...props}
    >
      <Container
        className={cn(
          "border-b-4 border-primary"
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
        <div className="flex flex-row text-[1.25rem] gap-1 leading-none h-5">
          <div>{record?.sets.filter((set) => set.win === true).length}</div>-
          <div>{record?.sets.filter((set) => set.win === false).length}</div>
        </div>
      </Container>
      <Container
        className={cn(
          "border-b-4 border-destructive"
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
