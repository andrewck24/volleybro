import {
  deriveSetPhase,
  getPreviousRally,
  type Entry,
  type Game,
} from "@/entities/game";

export type SetCompletion = { win: boolean | null; gameWin?: boolean | null };

/**
 * Derives what `completeSet` should write after an entry write, given the
 * set's entries as returned by that write. Returns null when the derived set
 * result matches what `game` already has, so the caller writes at most once
 * per set rather than on every rally.
 */
export function deriveSetCompletion(
  game: Game,
  setIndex: number,
  entries: Entry[],
): SetCompletion | null {
  const shimSets: { entries: Entry[] }[] = [];
  shimSets[setIndex] = { entries };
  const phase = deriveSetPhase(
    { info: game.info, sets: shimSets },
    setIndex,
    entries.length,
  );

  const lastRally = getPreviousRally(entries, entries.length);
  const win = phase.isSetInProgress
    ? null
    : lastRally!.home.score > lastRally!.away.score;

  // The set is read before the write, so a set created since then is absent
  // here — and a set that has just been created is undecided.
  if (win === (game.sets[setIndex]?.win ?? null)) return null;

  const setsWin = game.sets.map((set, i) => (i === setIndex ? win : set.win));
  const setCount = game.info.scoring.setCount;
  const homeSetsWon = setsWin.filter((w) => w === true).length;
  const awaySetsWon = setsWin.filter((w) => w === false).length;
  const gameWin =
    homeSetsWon > setCount / 2 || awaySetsWon > setCount / 2
      ? homeSetsWon > awaySetsWon
      : null;

  return { win, ...(gameWin !== game.win && { gameWin }) };
}
