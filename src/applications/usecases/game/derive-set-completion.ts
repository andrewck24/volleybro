import {
  deriveSetPhase,
  getPreviousRally,
  setTargetPoints,
  type Entry,
  type Game,
} from "@/entities/game";

export type SetCompletion = { win: boolean | null; gameWin?: boolean | null };

export function deriveSetCompletion(
  game: Game,
  setIndex: number,
  entries: Entry[],
): SetCompletion | null {
  const phase = deriveSetPhase(
    { entries },
    entries.length,
    setTargetPoints(game.info.scoring, setIndex),
  );

  const lastRally = getPreviousRally(entries, entries.length);
  const win = phase.isSetInProgress
    ? null
    : lastRally!.home.score > lastRally!.away.score;

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
