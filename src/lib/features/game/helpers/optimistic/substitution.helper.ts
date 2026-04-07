import { EntryType, MoveType, Side } from "@/entities/game";
import type {
  GamePlayerView,
  GameView,
  SubstitutionView,
} from "@/lib/features/game/types";

export const createSubstitutionHelper = (
  params: { gameId: string; setIndex: number; entryIndex: number },
  substitution: SubstitutionView,
  game: GameView,
) => {
  const { setIndex, entryIndex } = params;
  const side = substitution.team === Side.HOME ? "home" : "away";
  const lineup = game.sets[setIndex].lineups[side]!;

  // Update lineup
  const startingIndex = lineup.starting.findIndex(
    (p) => p.id?.toString() === substitution.players.out,
  );
  const subIndex = lineup.substitutes.findIndex(
    (p) => p.id?.toString() === substitution.players.in,
  );

  lineup.starting[startingIndex] = {
    id: substitution.players.in,
    position: lineup.starting[startingIndex].position,
    sub: {
      id: substitution.players.out,
      entryIndex:
        lineup.starting[startingIndex].sub?.entryIndex?.in !== undefined
          ? {
              ...lineup.starting[startingIndex].sub.entryIndex,
              out: entryIndex,
            }
          : { in: entryIndex },
    },
  };

  lineup.substitutes[subIndex] = {
    ...lineup.substitutes[subIndex],
    id: substitution.players.out,
    sub: {
      id: substitution.players.in,
      entryIndex:
        lineup.substitutes[subIndex].sub?.entryIndex?.in !== undefined
          ? {
              ...lineup.substitutes[subIndex].sub.entryIndex,
              out: entryIndex,
            }
          : { in: entryIndex },
    },
  };

  // Update game stats
  const startingPlayer = lineup.starting.find(
    (p) => p.id?.toString() === substitution.players.in,
  );
  if (startingPlayer?.sub?.entryIndex?.in !== undefined) {
    const player = game.teams[side].players.find(
      (p) => p.id.toString() === substitution.players.in,
    );
    if (player) {
      player.stats[setIndex] = createEmptyPlayerStats();
    }
  }

  game.teams[side].stats[setIndex].substitution++;
  game.sets[setIndex].entries[entryIndex] = {
    type: EntryType.SUBSTITUTION,
    ...substitution,
  };

  return game;
};

const createEmptyPlayerStats = (): GamePlayerView["stats"][number] => ({
  [MoveType.SERVING]: { success: 0, error: 0 },
  [MoveType.BLOCKING]: { success: 0, error: 0 },
  [MoveType.ATTACK]: { success: 0, error: 0 },
  [MoveType.RECEPTION]: { success: 0, error: 0 },
  [MoveType.DEFENSE]: { success: 0, error: 0 },
  [MoveType.SETTING]: { success: 0, error: 0 },
});
