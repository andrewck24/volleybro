import type { GameView } from "@/lib/features/game/types";

export const seqAt = (
  entries: GameView["sets"][number]["entries"],
  index: number,
) => entries[index]?.seq ?? index;
