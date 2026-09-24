import { MoveType, deriveSetStats } from "@/entities/game";
import type {
  GameView,
  ITeamsStats,
  TeamStatsView,
} from "@/lib/features/game/types";

const MOVE_TYPES = [
  MoveType.SERVING,
  MoveType.BLOCKING,
  MoveType.ATTACK,
  MoveType.RECEPTION,
  MoveType.DEFENSE,
  MoveType.SETTING,
  MoveType.UNFORCED,
] as const;

// A set with no entries, so the totals a derivation starts from — asking for
// them keeps the zeroing convention in deriveSetStats alone.
const emptyTeamStats = (): TeamStatsView =>
  deriveSetStats(undefined, { options: { serve: "home" } }).home;

const addTeamStats = (a: TeamStatsView, b: TeamStatsView): TeamStatsView => {
  const sum = emptyTeamStats();
  for (const type of MOVE_TYPES) {
    sum[type] = {
      success: a[type].success + b[type].success,
      error: a[type].error + b[type].error,
    };
  }
  sum.rotation = a.rotation + b.rotation;
  sum.timeout = a.timeout + b.timeout;
  sum.substitution = a.substitution + b.substitution;
  sum.challenge = a.challenge + b.challenge;
  return sum;
};

/** Per-set totals for `setIndex`, or whole-match totals summed across sets when `setIndex` is -1. */
export const getTeamsStats = (
  game: Pick<GameView, "sets">,
  setIndex: number,
): ITeamsStats => {
  if (setIndex !== -1) {
    const set = game.sets[setIndex];
    const derived = deriveSetStats(set?.entries, {
      options: set?.options ?? { serve: "home" },
    });
    return { home: derived.home, away: derived.away };
  }

  return game.sets.reduce<ITeamsStats>(
    (totals, set) => {
      const derived = deriveSetStats(set.entries, { options: set.options });
      return {
        home: addTeamStats(totals.home, derived.home),
        away: addTeamStats(totals.away, derived.away),
      };
    },
    { home: emptyTeamStats(), away: emptyTeamStats() },
  );
};
