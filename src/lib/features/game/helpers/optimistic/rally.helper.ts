import { EntryType, deriveSetPhase, setTargetPoints } from "@/entities/game";
import type { GameView, RallyView } from "@/lib/features/game/types";

export const createRallyHelper = (
  params: { gameId: string; setIndex: number; entryIndex: number },
  entryDraft: RallyView,
  game: GameView,
) => {
  const { setIndex, entryIndex } = params;
  // setIndex is the active set being recorded; sets are in bounds
  const set = game.sets[setIndex]!;

  set.entries[entryIndex] = {
    type: EntryType.RALLY,
    ...entryDraft,
  };

  const phase = processGamePhase(game, setIndex, entryIndex, entryDraft);

  return { game, phase };
};

export const updateRallyHelper = (
  params: { gameId: string; setIndex: number; entryIndex: number },
  entryDraft: RallyView,
  game: GameView,
) => {
  const { setIndex, entryIndex } = params;
  // setIndex is the active set being edited; guaranteed in bounds
  const set = game.sets[setIndex]!;
  const originalEntry = set.entries[entryIndex];
  if (!originalEntry || originalEntry.type !== EntryType.RALLY) {
    throw new Error("Entry is not a rally");
  }

  set.entries[entryIndex] = {
    type: EntryType.RALLY,
    ...entryDraft,
  };

  const phase = processGamePhase(game, setIndex, entryIndex, entryDraft);

  return { game, phase };
};

const processGamePhase = (
  game: GameView,
  setIndex: number,
  entryIndex: number,
  entryDraft: RallyView,
) => {
  const targetPoints = setTargetPoints(game.info.scoring, setIndex);
  const phase = deriveSetPhase(
    game.sets[setIndex],
    entryIndex + 1,
    targetPoints,
  );
  // setIndex is the active set being processed; guaranteed in bounds
  const set = game.sets[setIndex]!;

  if (phase.isSetInProgress) {
    // Reset win status if the set/game is still in progress
    if (typeof set.win === "boolean") {
      set.win = null;
    }
    if (typeof game.win === "boolean") game.win = null;
  } else {
    // Set is complete, determine winners
    const { home, away } = entryDraft;
    set.win = home.score > away.score;

    // If the game is finished, calculate the overall game result
    const homeSetsWonCount = game.sets.filter((set) => set.win).length;
    const awaySetsWonCount = game.sets.filter(
      (set) => set.win === false,
    ).length;
    const setsCount = game.info.scoring.setCount;

    if (homeSetsWonCount > setsCount / 2 || awaySetsWonCount > setsCount / 2) {
      game.win = homeSetsWonCount > awaySetsWonCount;
    }
  }

  return phase;
};
