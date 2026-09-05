import {
  EntryType,
  deriveSetPhase,
  setTargetPoints,
  upsertEntries,
  type EntryIdentity,
  type SetPhase,
} from "@/entities/game";
import type { GameView, RallyView } from "@/lib/features/game/types";

const asEntry = (entryDraft: RallyView & EntryIdentity) =>
  ({ type: EntryType.RALLY, ...entryDraft }) as const;

/** An edit must land on a rally; anything else is a bug in the caller. */
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

/**
 * Derives the set phase as of the entry being written, without writing it.
 * Reads the merged view: a phase derived from the server's entries alone
 * would carry a score that is short every rally still waiting to be sent.
 */
export const deriveEntryPhase = (
  game: GameView,
  setIndex: number,
  entryIndex: number,
  entryDraft: RallyView & EntryIdentity,
): SetPhase =>
  deriveSetPhase(
    // setIndex is the active set being processed; guaranteed in bounds
    {
      entries: upsertEntries(game.sets[setIndex]!.entries, [
        asEntry(entryDraft),
      ]),
    },
    entryIndex + 1,
    setTargetPoints(game.info.scoring, setIndex),
  );

/**
 * Applies the entry and a previously-derived phase, returning a new GameView.
 * Written by identity rather than by position, because this runs against the
 * raw cache, which may hold fewer entries than the view the phase came from.
 */
export const applyEntry = (
  game: GameView,
  setIndex: number,
  entryDraft: RallyView & EntryIdentity,
  phase: SetPhase,
): GameView => {
  // setIndex is the active set being processed; guaranteed in bounds
  const set = game.sets[setIndex]!;
  const sets = game.sets.slice();
  const entries = upsertEntries(set.entries, [asEntry(entryDraft)]);

  // Editing a rally back into a set that is still being played withdraws any
  // result recorded for it, and with it the game result it fed.
  if (phase.isSetInProgress) {
    sets[setIndex] = { ...set, entries, win: null };
    return { ...game, sets, win: null };
  }

  const { home, away } = entryDraft;
  sets[setIndex] = { ...set, entries, win: home.score > away.score };

  const setsWonHome = sets.filter((s) => s.win).length;
  const setsWonAway = sets.filter((s) => s.win === false).length;
  const { setCount } = game.info.scoring;
  const decided = setsWonHome > setCount / 2 || setsWonAway > setCount / 2;

  return { ...game, sets, win: decided ? setsWonHome > setsWonAway : game.win };
};
