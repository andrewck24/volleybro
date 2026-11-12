import { FOLDED_RALLIES } from "@/components/landing/demo-data";
import { EntryType } from "@/entities/game";
import type { EntryView } from "@/lib/features/game/types";
import { scoringMoves } from "@/lib/scoring-moves";

export const entriesOf = (
  idPrefix: string,
  count = FOLDED_RALLIES.length,
): EntryView[] =>
  FOLDED_RALLIES.slice(0, count).map((rally, seq) => ({
    type: EntryType.RALLY,
    id: `${idPrefix}-${seq}`,
    seq,
    win: rally.homeWon,
    home: {
      score: rally.homeScore,
      type: scoringMoves[rally.homeMoveIndex]!.type,
      num: rally.homeMoveIndex,
      player: { id: rally.player, zone: 4 },
    },
    away: {
      score: rally.awayScore,
      type: scoringMoves[rally.awayMoveIndex]!.type,
      num: rally.awayMoveIndex,
    },
  }));
