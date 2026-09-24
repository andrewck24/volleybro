import { cn } from "@/lib/utils";

type Side = "home" | "away";

const sideLabel: Record<Side, string> = { home: "我方", away: "對手" };
const sideFillClass: Record<Side, string> = {
  home: "bg-primary",
  away: "bg-destructive",
};
const sideRingClass: Record<Side, string> = {
  home: "ring-primary/50",
  away: "ring-destructive/50",
};

/**
 * One cell per set needed to win, sized from the match's own set count
 * (five-set matches: three cells; three-set matches: two). Cells are
 * hollow until won and fill from the bottom, since the bottom cell is the
 * one closest to being reached first.
 */
export const SetTally = ({
  won,
  needed,
  side,
}: {
  won: number;
  needed: number;
  side: Side;
}) => {
  return (
    <div
      role="img"
      aria-label={`${sideLabel[side]}已勝 ${won} 局，${needed} 局獲勝`}
      className="flex h-21 w-1.5 shrink-0 flex-col items-center justify-center gap-1"
    >
      {Array.from({ length: needed }, (_, i) => {
        const filled = i >= needed - won;
        return (
          <span
            key={i}
            data-testid="set-tally-cell"
            data-filled={filled}
            className={cn(
              "h-3.5 w-1.5 rounded-[2px]",
              filled ? sideFillClass[side] : cn("ring-1", sideRingClass[side]),
            )}
          />
        );
      })}
    </div>
  );
};
