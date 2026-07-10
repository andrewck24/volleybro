"use client";
import { OppoMoves } from "@/components/game/panel/moves/oppo";
import { OursMoves } from "@/components/game/panel/moves/ours";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppSelector } from "@/lib/redux/hooks";
import type { ScoringMove } from "@/lib/scoring-moves";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const GameMoves = ({ className }: { className?: string }) => {
  const gameState = useAppSelector((state) => state.game);
  const { status } = gameState[gameState.mode];

  // The active step label and the home/away body switch are both driven by the
  // progress bar (status.panel); the panel no longer carries its own tab-header
  // titles. The body slides in directionally on each step switch: forward
  // (home -> away) enters from the right, backward from the left, replayed via
  // the `key` remount. Direction is derived from the previous step held in
  // state (React's "store previous value in state" pattern) so it survives to
  // commit -- reading a ref during render would not. ponytail: reuses
  // tailwindcss-animate's slide-in utilities instead of the mockup's raw
  // @keyframes.
  const step = status.panel === "away" ? 2 : 1;
  const [prevStep, setPrevStep] = useState(step);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  if (prevStep !== step) {
    setDirection(step > prevStep ? "forward" : "backward");
    setPrevStep(step);
  }

  return (
    <Card className={cn("w-full flex-1 pb-4", className)}>
      <div
        key={status.panel}
        className={cn(
          "flex min-h-0 w-full flex-1 flex-col duration-300 animate-in fade-in",
          direction === "forward"
            ? "slide-in-from-right-6"
            : "slide-in-from-left-6",
        )}
      >
        {status.panel === "home" ? <OursMoves /> : <OppoMoves />}
      </div>
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
