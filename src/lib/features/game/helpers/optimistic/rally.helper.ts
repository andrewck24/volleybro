import { EntryType, MoveType } from "@/entities/game";
import { getSetPhase, getServingStatus } from "@/lib/features/game/helpers";
import type { GameView, RallyView } from "@/lib/features/game/types";

type StatEntry = { success: number; error: number };
type PlayerMoveType = Exclude<MoveType, MoveType.UNFORCED>;

export const createRallyHelper = (
  params: { gameId: string; setIndex: number; entryIndex: number },
  entryDraft: RallyView,
  game: GameView,
) => {
  const { setIndex, entryIndex } = params;
  // setIndex is the active set being recorded; sets and per-set stats are in bounds
  const set = game.sets[setIndex]!;

  updateStats(game, setIndex, entryDraft);

  // update rotation
  const isServing = getServingStatus(set, entryIndex);
  if (entryDraft.win && !isServing)
    game.teams.home.stats[setIndex]!.rotation += 1;

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
  const { type: _type, ...originalRally } = originalEntry;

  discardOriginalStats(game, setIndex, originalRally);
  updateStats(game, setIndex, entryDraft);

  set.entries[entryIndex] = {
    type: EntryType.RALLY,
    ...entryDraft,
  };

  // 若有更新 rally 之得分結果，則重新計算 rotation
  if (originalRally.win !== entryDraft.win) updateRotation(game, setIndex);

  const phase = processGamePhase(game, setIndex, entryIndex, entryDraft);

  return { game, phase };
};

// A rally can name no player, and "nobody" must not match a squad member whose
// own id is absent.
const findScorer = (game: GameView, rally: RallyView) => {
  const id = rally.home.player?.id;
  return id ? game.teams.home.players.find((player) => player.id === id) : null;
};

const discardOriginalStats = (
  game: GameView,
  setIndex: number,
  originalRally: RallyView,
) => {
  const { win, home, away } = originalRally;
  const homePlayer = findScorer(game, originalRally);
  const homeTeam = game.teams.home;
  const awayTeam = game.teams.away;

  // per-set stats arrays are parallel to sets; setIndex is in bounds
  const homeStat = homeTeam.stats[setIndex]![home.type] as StatEntry;
  const awayStat = awayTeam.stats[setIndex]![away.type] as StatEntry;
  if (win) {
    if (homePlayer) {
      (
        homePlayer.stats[setIndex]![home.type as PlayerMoveType] as StatEntry
      ).success -= 1;
    }
    homeStat.success -= 1;
    awayStat.error -= 1;
  } else {
    if (homePlayer) {
      (
        homePlayer.stats[setIndex]![home.type as PlayerMoveType] as StatEntry
      ).error -= 1;
    }
    homeStat.error -= 1;
    awayStat.success -= 1;
  }
};

const updateStats = (
  game: GameView,
  setIndex: number,
  entryDraft: RallyView,
) => {
  const { win, home, away } = entryDraft;
  const homePlayer = findScorer(game, entryDraft);
  const homeTeam = game.teams.home;
  const awayTeam = game.teams.away;

  // per-set stats arrays are parallel to sets; setIndex is in bounds
  const homeStat = homeTeam.stats[setIndex]![home.type] as StatEntry;
  const awayStat = awayTeam.stats[setIndex]![away.type] as StatEntry;
  if (win) {
    if (homePlayer) {
      (
        homePlayer.stats[setIndex]![home.type as PlayerMoveType] as StatEntry
      ).success += 1;
    }
    homeStat.success += 1;
    awayStat.error += 1;
  } else {
    if (homePlayer) {
      (
        homePlayer.stats[setIndex]![home.type as PlayerMoveType] as StatEntry
      ).error += 1;
    }
    homeStat.error += 1;
    awayStat.success += 1;
  }
};

const updateRotation = (game: GameView, setIndex: number) => {
  // setIndex is the active set; sets and per-set stats are in bounds
  const set = game.sets[setIndex]!;
  let rotation = 0;
  let isServing = set.options.serve === "home";
  for (const entry of set.entries) {
    if (entry.type !== EntryType.RALLY) continue;
    if (entry.win && !isServing) rotation += 1;
    isServing = entry.win;
  }
  game.teams.home.stats[setIndex]!.rotation = rotation;
};

const processGamePhase = (
  game: GameView,
  setIndex: number,
  entryIndex: number,
  entryDraft: RallyView,
) => {
  const phase = getSetPhase(game, setIndex, entryIndex + 1);
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
