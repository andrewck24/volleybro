import {
  EntryType,
  deriveSetPhase,
  setTargetPoints,
  type EntryIdentity,
  type SetPhase,
} from "@/entities/game";
import type { GameView, RallyView } from "@/lib/features/game/types";

export const createRallyHelper = (
  params: { gameId: string; setIndex: number; entryIndex: number },
  entryDraft: RallyView & EntryIdentity,
  game: GameView,
) => {
  const { setIndex, entryIndex } = params;
  const phase = deriveEntryPhase(game, setIndex, entryIndex, entryDraft);
  const updatedGame = applyEntry(game, setIndex, entryIndex, entryDraft, phase);

  return { game: updatedGame, phase };
};

export const updateRallyHelper = (
  params: { gameId: string; setIndex: number; entryIndex: number },
  entryDraft: RallyView & EntryIdentity,
  game: GameView,
) => {
  const { setIndex, entryIndex } = params;
  // setIndex is the active set being edited; guaranteed in bounds
  const originalEntry = game.sets[setIndex]!.entries[entryIndex];
  if (!originalEntry || originalEntry.type !== EntryType.RALLY) {
    throw new Error("Entry is not a rally");
  }

  const phase = deriveEntryPhase(game, setIndex, entryIndex, entryDraft);
  const updatedGame = applyEntry(game, setIndex, entryIndex, entryDraft, phase);

  return { game: updatedGame, phase };
};

/** Derives the set phase as of the entry being written, without writing it. */
export const deriveEntryPhase = (
  game: GameView,
  setIndex: number,
  entryIndex: number,
  entryDraft: RallyView & EntryIdentity,
): SetPhase => {
  const targetPoints = setTargetPoints(game.info.scoring, setIndex);
  // setIndex is the active set being processed; guaranteed in bounds
  const set = game.sets[setIndex]!;
  const entries = set.entries.slice();
  entries[entryIndex] = { type: EntryType.RALLY, ...entryDraft };

  return deriveSetPhase({ entries }, entryIndex + 1, targetPoints);
};

/** Applies the entry and a previously-derived phase, returning a new GameView. */
export const applyEntry = (
  game: GameView,
  setIndex: number,
  entryIndex: number,
  entryDraft: RallyView & EntryIdentity,
  phase: SetPhase,
): GameView => {
  // setIndex is the active set being processed; guaranteed in bounds
  const set = game.sets[setIndex]!;
  const entries = set.entries.slice();
  entries[entryIndex] = { type: EntryType.RALLY, ...entryDraft };

  let win = set.win;
  if (phase.isSetInProgress) {
    // Reset win status if the set/game is still in progress
    if (typeof win === "boolean") win = null;
  } else {
    // Set is complete, determine winners
    const { home, away } = entryDraft;
    win = home.score > away.score;
  }

  const sets = game.sets.slice();
  sets[setIndex] = { ...set, entries, win };

  let gameWin = game.win;
  if (phase.isSetInProgress) {
    if (typeof gameWin === "boolean") gameWin = null;
  } else {
    // If the game is finished, calculate the overall game result
    const homeSetsWonCount = sets.filter((s) => s.win).length;
    const awaySetsWonCount = sets.filter((s) => s.win === false).length;
    const setsCount = game.info.scoring.setCount;

    if (homeSetsWonCount > setsCount / 2 || awaySetsWonCount > setsCount / 2) {
      gameWin = homeSetsWonCount > awaySetsWonCount;
    }
  }

  return { ...game, sets, win: gameWin };
};
