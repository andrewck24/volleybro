"use client";
import { OppoMoves } from "@/components/record/panel/moves/oppo";
import { OursMoves } from "@/components/record/panel/moves/ours";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recordActions } from "@/lib/features/record/record-slice";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import type { ScoringMove } from "@/lib/scoring-moves";
import { cn } from "@/lib/utils";
import { RiEditBoxLine } from "react-icons/ri";
export const RecordMoves = ({
  recordId,
  className,
}: {
  recordId: string;
  className?: string;
}) => {
  const dispatch = useAppDispatch();
  const recordState = useAppSelector((state) => state.record);
  const { status, recording } = recordState[recordState.mode];

  return (
    <Card className={cn("w-full flex-1 pb-4", className)}>
      <CardHeader className="flex-row">
        <CardTitle
          onClick={() => dispatch(recordActions.setPanel("home"))}
          className={cn(
            "overflow-hidden border-b-2 border-l-2 border-primary p-1 text-nowrap transition-all",
            status.panel === "home" ? "w-full" : "w-8",
          )}
        >
          <RiEditBoxLine className="w-6 min-w-6" />
          我方得失分紀錄
        </CardTitle>
        <CardTitle
          onClick={() => dispatch(recordActions.setPanel("away"))}
          className={cn(
            "overflow-hidden border-b-2 border-l-2 border-destructive p-1 text-nowrap transition-all",
            status.panel !== "home"
              ? "w-full"
              : recording.home.num === null
                ? "sr-only w-0"
                : "w-8",
          )}
        >
          <RiEditBoxLine className="w-6 min-w-6" />
          對方得失分紀錄
        </CardTitle>
      </CardHeader>
      {status.panel === "home" ? (
        <OursMoves />
      ) : (
        <OppoMoves recordId={recordId} />
      )}
    </Card>
  );
};

export const Container = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <CardContent className={cn("grid w-full flex-1 grid-cols-2", className)}>
      {children}
    </CardContent>
  );
};

export const MoveButton = ({
  move,
  toggled,
  onClick,
  children,
}: {
  move: ScoringMove;
  toggled: boolean;
  onClick: (move: ScoringMove) => void;
  children?: React.ReactNode;
}) => {
  const WIN_STYLE =
    "bg-primary/30 text-foreground [&>svg]:text-primary shadow-sm hover:bg-primary/80";
  const LOSE_STYLE =
    "bg-destructive/30 text-foreground [&>svg]:text-destructive shadow-sm hover:bg-destructive/80";

  return (
    <Button
      key={`${move.type}-${move.num}`}
      variant={move.win ? "default" : "destructive"}
      size="lg"
      className={cn(
        "h-full pr-1 text-[1.5rem] transition-colors duration-200",
        toggled || (move.win ? WIN_STYLE : LOSE_STYLE),
      )}
      onClick={() => onClick(move)}
    >
      {children}
    </Button>
  );
};
