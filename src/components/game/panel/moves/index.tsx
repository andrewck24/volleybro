"use client";
import { OppoMoves } from "@/components/game/panel/moves/oppo";
import { OursMoves } from "@/components/game/panel/moves/ours";
import type { useStepSwipe } from "@/components/game/panel/use-step-swipe";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/lib/redux/hooks";
import type { ScoringMove } from "@/lib/scoring-moves";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const GameMoves = ({
  className,
  swipe,
}: {
  className?: string;
  swipe?: ReturnType<typeof useStepSwipe>;
}) => {
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
    // Independent panel body (not a Card): keeps only bg/gap/padding, drops the
    // card chrome (rounded/shadow/ring). The swipe handlers make the whole body
    // switch steps (design: swipe anywhere on the panel, not just the bar);
    // overflow-hidden clips the sliding body so the switch reads as a full-width
    // tab transition; min-h-0 lets the inner body scroll instead of overflowing.
    <div
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col gap-2 overflow-hidden bg-card p-2",
        className,
      )}
      {...swipe}
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
    </div>
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
    <div className={cn("grid w-full flex-1 grid-cols-2 gap-2", className)}>
      {children}
    </div>
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
        // min-h-0 lets the button shrink below its content height so an
        // auto-rows-fr grid (opponent errors) can fit every row with no scroll;
        // a grid/flex item defaults to min-height:auto and would overflow.
        "h-full min-h-0 pr-1 text-[1.5rem] transition-colors duration-200",
        toggled || (move.win ? WIN_STYLE : LOSE_STYLE),
      )}
      onClick={() => onClick(move)}
    >
      {children}
    </Button>
  );
};
