import type { Set } from "@/entities/record";
import { getPreviousRally } from "@/lib/features/record/helpers";
import { cn } from "@/lib/utils";

export const Scores = ({ sets }: { sets: Set[] }) => {
  return (
    <div className="flex flex-1 flex-row items-center justify-center gap-2">
      {sets.map((set, index) => (
        <Score key={index} set={set} />
      ))}
    </div>
  );
};

const Score = ({ set }: { set: Set }) => {
  const previousRally = getPreviousRally(set.entries, set.entries.length);
  const homeScore = previousRally?.home.score || 0;
  const awayScore = previousRally?.away.score || 0;
  const isHomeWin = homeScore > awayScore;
  const isAwayWin = awayScore > homeScore;

  return (
    <div className="flex items-center justify-center text-lg">
      <div
        className={cn(
          "flex items-center justify-center px-1",
          isHomeWin || "text-muted-foreground",
        )}
      >
        {homeScore}
      </div>
      <div className="text-muted-foreground">-</div>
      <div
        className={cn(
          "flex items-center justify-center px-1",
          isAwayWin || "text-muted-foreground",
        )}
      >
        {awayScore}
      </div>
    </div>
  );
};
