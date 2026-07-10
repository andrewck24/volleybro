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
  const { status, entryDraft: draft } = gameState[gameState.mode];

  // The body slides in directionally on each step switch: forward enters from
  // the right, backward from the left, replayed via the `key` remount.
  // Key on the real step (0 player-select / 1 home / 2 away), NOT status.panel:
  // picking a player advances step 0 -> 1 while panel stays "home" (the content
  // goes from the opponent-error list to the skill grid), so keying on panel
  // alone would miss that transition. Direction is derived from the previous
  // step held in state (React's "store previous value in state" pattern) so it
  // survives to commit -- reading a ref during render would not. ponytail:
  // reuses tailwindcss-animate's slide-in utilities instead of raw @keyframes.
  const step = status.panel === "away" ? 2 : draft.home.player?.id ? 1 : 0;
  const [prevStep, setPrevStep] = useState(step);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  if (prevStep !== step) {
    setDirection(step > prevStep ? "forward" : "backward");
    setPrevStep(step);
  }

  return (
    // overflow-hidden clips the sliding body to the card so the switch reads as
    // a full-width tab transition rather than a subtle nudge; min-h-0 lets the
    // inner body scroll instead of overflowing the panel.
    <Card
      className={cn("min-h-0 w-full flex-1 overflow-hidden pb-4", className)}
    >
      <div
        key={step}
        className={cn(
          "flex min-h-0 w-full flex-1 flex-col overflow-y-auto duration-300 ease-out animate-in fade-in",
          // Full panel-width directional slide (tab-container feel): forward
          // advances (player -> home -> away) enters from the right, backward
          // from the left.
          direction === "forward"
            ? "slide-in-from-right-full"
            : "slide-in-from-left-full",
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
