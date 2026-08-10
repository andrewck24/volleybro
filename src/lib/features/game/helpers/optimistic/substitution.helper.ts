import { EntryType, Side } from "@/entities/game";
import type { GameView, SubstitutionView } from "@/lib/features/game/types";

export const createSubstitutionHelper = (
  params: { gameId: string; setIndex: number; entryIndex: number },
  substitution: SubstitutionView,
  game: GameView,
) => {
  const { setIndex, entryIndex } = params;
  const side = substitution.team === Side.HOME ? "home" : "away";
  // setIndex is the active set being recorded; guaranteed in bounds
  const set = game.sets[setIndex]!;
  const lineup = set.lineups[side]!;

  // Update lineup
  const startingIndex = lineup.starting.findIndex(
    (p) => p.id?.toString() === substitution.players.out,
  );
  const subIndex = lineup.substitutes.findIndex(
    (p) => p.id?.toString() === substitution.players.in,
  );
  const starter = lineup.starting[startingIndex];
  const substitute = lineup.substitutes[subIndex];
  if (!starter || !substitute) return game;

  lineup.starting[startingIndex] = {
    id: substitution.players.in,
    position: starter.position,
    sub: {
      id: substitution.players.out,
      entryIndex:
        starter.sub?.entryIndex?.in !== undefined
          ? {
              ...starter.sub.entryIndex,
              out: entryIndex,
            }
          : { in: entryIndex },
    },
  };

  lineup.substitutes[subIndex] = {
    ...substitute,
    id: substitution.players.out,
    sub: {
      id: substitution.players.in,
      entryIndex:
        substitute.sub?.entryIndex?.in !== undefined
          ? {
              ...substitute.sub.entryIndex,
              out: entryIndex,
            }
          : { in: entryIndex },
    },
  };

  set.entries[entryIndex] = {
    type: EntryType.SUBSTITUTION,
    ...substitution,
  };

  return game;
};
