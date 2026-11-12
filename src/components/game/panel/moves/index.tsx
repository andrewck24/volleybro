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

  const step = status.panel === "away" ? 2 : draft.home.player?.id ? 1 : 0;
  const [prevStep, setPrevStep] = useState(step);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  if (prevStep !== step) {
    setDirection(step > prevStep ? "forward" : "backward");
    setPrevStep(step);
  }

  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col gap-2 overflow-hidden bg-card p-2",
        className,
      )}
      {...swipe}
    >
      <div
        key={step}
        data-moves-step={step}
        className={cn(
          "flex min-h-0 w-full flex-1 flex-col overflow-y-auto duration-300 ease-out animate-in fade-in",
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
  "data-move-grid": moveGrid,
}: {
  children?: React.ReactNode;
  className?: string;
  "data-move-grid"?: "home" | "away";
}) => {
  return (
    <div
      data-move-grid={moveGrid}
      className={cn("grid w-full flex-1 grid-cols-2 gap-2", className)}
    >
      {children}
    </div>
  );
};

const WIN_STYLE =
  "bg-primary/30 text-foreground [&_svg]:text-primary-text shadow-sm hover:bg-primary/80";
const LOSE_STYLE =
  "bg-away/30 text-foreground [&_svg]:text-away-text shadow-sm hover:bg-away/80";

const moveLook = (
  win: boolean,
  toggled: boolean,
): { variant: "default" | "court" | "secondary"; tint?: string } => {
  if (toggled) return { variant: win ? "default" : "court" };
  return win
    ? { variant: "default", tint: WIN_STYLE }
    : { variant: "secondary", tint: LOSE_STYLE };
};

export const MOVE_CELL_CLASS =
  "h-full pr-1 text-[clamp(0.75rem,6.667vw,1.5rem)] leading-7";

export const MoveButton = ({
  move,
  toggled,
  onClick,
  className,
  children,
  ...props
}: {
  move: ScoringMove;
  toggled: boolean;
  onClick: (move: ScoringMove) => void;
  className?: string;
  children?: React.ReactNode;
} & Pick<React.ComponentProps<"button">, "aria-label">) => {
  const look = moveLook(move.win, toggled);

  return (
    <Button
      key={`${move.type}-${move.num}`}
      data-move-outcome={move.win ? "win" : "loss"}
      variant={look.variant}
      size="lg"
      className={cn(
        MOVE_CELL_CLASS,
        "transition-colors duration-200",
        look.tint,
        className,
      )}
      onClick={() => onClick(move)}
      {...props}
    >
      {children}
    </Button>
  );
};
