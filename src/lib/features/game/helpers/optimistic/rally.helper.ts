import {
  type Game,
  type PlayerStats,
  type Rally,
  EntryType,
  createRallyEntry,
} from "@/entities/game";
import {
  getServingStatus,
  matchPhaseHelper,
} from "@/lib/features/game/helpers";

type StatEntry = { success: number; error: number };

export const createRallyHelper = (
  params: { gameId: string; setIndex: number; entryIndex: number },
  entryDraft: Rally,
  game: Game,
) => {
  const { setIndex, entryIndex } = params;

  updateStats(game, setIndex, entryDraft);

  // update rotation
  const isServing = getServingStatus(game.sets[setIndex], entryIndex);
  if (entryDraft.win && !isServing)
    game.teams.home.stats[setIndex].rotation += 1;

  game.sets[setIndex].entries[entryIndex] = createRallyEntry(entryDraft);

  const phase = processMatchPhase(game, setIndex, entryIndex, entryDraft);

  return { game, phase };
};

export const updateRallyHelper = (
  params: { gameId: string; setIndex: number; entryIndex: number },
  entryDraft: Rally,
  game: Game,
) => {
  const { setIndex, entryIndex } = params;
  const entries = game.sets[setIndex]?.entries;
  const originalEntry = entries[entryIndex];
  if (originalEntry.type !== EntryType.RALLY) {
    throw new Error("Entry is not a rally");
  }
  const { type: _type, ...originalRally } = originalEntry;

  discardOriginalStats(game, setIndex, originalRally);
  updateStats(game, setIndex, entryDraft);

  game.sets[setIndex].entries[entryIndex] = createRallyEntry(entryDraft);

  // 若有更新 rally 之得分結果，則重新計算 rotation
  if (originalRally.win !== entryDraft.win) updateRotation(game, setIndex);

  const phase = processMatchPhase(game, setIndex, entryIndex, entryDraft);

  return { game, phase };
};

const discardOriginalStats = (
  game: Game,
  setIndex: number,
  originalRally: Rally,
) => {
  const { win, home, away } = originalRally;
  const homePlayerIndex = game.teams.home.players.findIndex(
    (player) => player.id === home.player?.id,
  );
  const homePlayer = game.teams.home.players[homePlayerIndex];
  const homeTeam = game.teams.home;
  const awayTeam = game.teams.away;

  const homeStat = homeTeam.stats[setIndex][home.type] as StatEntry;
  const awayStat = awayTeam.stats[setIndex][away.type] as StatEntry;
  if (win) {
    if (homePlayerIndex !== -1) {
      (
        homePlayer.stats[setIndex][home.type as keyof PlayerStats] as StatEntry
      ).success -= 1;
    }
    homeStat.success -= 1;
    awayStat.error -= 1;
  } else {
    if (homePlayerIndex !== -1) {
      (
        homePlayer.stats[setIndex][home.type as keyof PlayerStats] as StatEntry
      ).error -= 1;
    }
    homeStat.error -= 1;
    awayStat.success -= 1;
  }
};

const updateStats = (game: Game, setIndex: number, entryDraft: Rally) => {
  const { win, home, away } = entryDraft;
  const homePlayerIndex = game.teams.home.players.findIndex(
    (player) => player.id === home.player?.id,
  );
  const homePlayer = game.teams.home.players[homePlayerIndex];
  const homeTeam = game.teams.home;
  const awayTeam = game.teams.away;

  const homeStat = homeTeam.stats[setIndex][home.type] as StatEntry;
  const awayStat = awayTeam.stats[setIndex][away.type] as StatEntry;
  if (win) {
    if (homePlayerIndex !== -1) {
      (
        homePlayer.stats[setIndex][home.type as keyof PlayerStats] as StatEntry
      ).success += 1;
    }
    homeStat.success += 1;
    awayStat.error += 1;
  } else {
    if (homePlayerIndex !== -1) {
      (
        homePlayer.stats[setIndex][home.type as keyof PlayerStats] as StatEntry
      ).error += 1;
    }
    homeStat.error += 1;
    awayStat.success += 1;
  }
};

const updateRotation = (game: Game, setIndex: number) => {
  const set = game.sets[setIndex];
  let rotation = 0;
  let isServing = set.options.serve === "home";
  for (const entry of set.entries) {
    if (entry.type !== EntryType.RALLY) continue;
    if (entry.win && !isServing) rotation += 1;
    isServing = entry.win;
  }
  game.teams.home.stats[setIndex].rotation = rotation;
};

const processMatchPhase = (
  game: Game,
  setIndex: number,
  entryIndex: number,
  entryDraft: Rally,
) => {
  const phase = matchPhaseHelper(game, setIndex, entryIndex + 1);

  if (phase.inProgress) {
    // Reset win status if the set/match is still in progress
    if (typeof game.sets[setIndex].win === "boolean") {
      game.sets[setIndex].win = null;
    }
    if (typeof game.win === "boolean") game.win = null;
  } else {
    // Set is complete, determine winners
    const { home, away } = entryDraft;
    game.sets[setIndex].win = home.score > away.score;

    // If the match is finished, calculate the overall match result
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
