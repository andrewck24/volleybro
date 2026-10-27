import type { GameView } from "@/lib/features/game/types";

/** Substitution marks are entry seqs; an entry without one counts by position. */
export const seqAt = (
  entries: GameView["sets"][number]["entries"],
  index: number,
) => entries[index]?.seq ?? index;
