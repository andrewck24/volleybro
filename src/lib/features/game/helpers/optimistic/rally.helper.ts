import {
  EntryType,
  deriveSetPhase,
  setTargetPoints,
  type EntryIdentity,
  type SetPhase,
} from "@/entities/game";
import { withEntries } from "@/lib/features/game/pending-writes";
import type { GameView, RallyView } from "@/lib/features/game/types";

const asEntry = (entryDraft: RallyView & EntryIdentity) =>
  ({ type: EntryType.RALLY, ...entryDraft }) as const;

export const assertRallyAt = (
  game: GameView,
  setIndex: number,
  entryIndex: number,
) => {
  const entry = game.sets[setIndex]?.entries[entryIndex];
  if (!entry || entry.type !== EntryType.RALLY) {
    throw new Error("Entry is not a rally");
  }
};

// Give this the merged view, never the cache: on an edit, a shorter array
// walks back onto a later rally and reads its score.
export const deriveEntryPhase = (
  game: GameView,
  setIndex: number,
  entryIndex: number,
  entryDraft: RallyView & EntryIdentity,
): SetPhase =>
  deriveSetPhase(
    withEntries(game.sets[setIndex]!, [asEntry(entryDraft)]),
    entryIndex + 1,
    setTargetPoints(game.info.scoring, setIndex),
  );

export const applyEntry = (
  game: GameView,
  setIndex: number,
  entryDraft: RallyView & EntryIdentity,
  phase: SetPhase,
): GameView => {
  const set = game.sets[setIndex]!;
  const sets = game.sets.slice();
  const { entries, lineups } = withEntries(set, [asEntry(entryDraft)]);

  if (phase.isSetInProgress) {
    sets[setIndex] = { ...set, entries, lineups, win: null };
    return { ...game, sets, win: null };
  }

  const { home, away } = entryDraft;
  sets[setIndex] = { ...set, entries, lineups, win: home.score > away.score };

  const setsWonHome = sets.filter((s) => s.win).length;
  const setsWonAway = sets.filter((s) => s.win === false).length;
  const { setCount } = game.info.scoring;
  const decided = setsWonHome > setCount / 2 || setsWonAway > setCount / 2;

  return { ...game, sets, win: decided ? setsWonHome > setsWonAway : game.win };
};
