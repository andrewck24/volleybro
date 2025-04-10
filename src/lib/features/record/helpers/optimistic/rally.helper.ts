import {
  getServingStatus,
  matchPhaseHelper,
} from "@/lib/features/record/helpers";
import { type Record, type Rally, EntryType } from "@/entities/record";

export const createRallyHelper = (
  params: { recordId: string; setIndex: number; entryIndex: number },
  recording: Rally,
  record: Record
) => {
  const { setIndex, entryIndex } = params;

  updateStats(record, setIndex, recording);

  // update rotation
  const isServing = getServingStatus(record.sets[setIndex], entryIndex);
  if (recording.win && !isServing)
    record.teams.home.stats[setIndex].rotation += 1;

  record.sets[setIndex].entries[entryIndex] = {
    type: EntryType.RALLY,
    data: recording,
  };

  const phase = processMatchPhase(record, setIndex, entryIndex, recording);

  return { record, phase };
};

export const updateRallyHelper = (
  params: { recordId: string; setIndex: number; entryIndex: number },
  recording: Rally,
  record: Record
) => {
  const { setIndex, entryIndex } = params;
  const entries = record.sets[setIndex]?.entries;
  const originalEntry = entries[entryIndex];
  if (originalEntry.type !== EntryType.RALLY) {
    throw new Error("Entry is not a rally");
  }
  const originalRally = originalEntry.data as Rally;

  discardOriginalStats(record, setIndex, originalRally);
  updateStats(record, setIndex, recording);

  record.sets[setIndex].entries[entryIndex] = {
    type: EntryType.RALLY,
    data: recording,
  };

  // 若有更新 rally 之得分結果，則重新計算 rotation
  if (originalRally.win !== recording.win) updateRotation(record, setIndex);

  const phase = processMatchPhase(record, setIndex, entryIndex, recording);

  return { record, phase };
};

const discardOriginalStats = (
  record: Record,
  setIndex: number,
  originalRally: Rally
) => {
  const { win, home, away } = originalRally;
  const homePlayerIndex = record.teams.home.players.findIndex(
    (player) => player._id === home.player._id
  );
  const homePlayer = record.teams.home.players[homePlayerIndex];
  const homeTeam = record.teams.home;
  const awayTeam = record.teams.away;

  if (win) {
    if (homePlayerIndex !== -1) {
      homePlayer.stats[setIndex][home.type].success -= 1;
    }
    homeTeam.stats[setIndex][home.type].success -= 1;
    awayTeam.stats[setIndex][away.type].error -= 1;
  } else {
    if (homePlayerIndex !== -1) {
      homePlayer.stats[setIndex][home.type].error -= 1;
    }
    homeTeam.stats[setIndex][home.type].error -= 1;
    awayTeam.stats[setIndex][away.type].success -= 1;
  }
};

const updateStats = (record: Record, setIndex: number, recording: Rally) => {
  const { win, home, away } = recording;
  const homePlayerIndex = record.teams.home.players.findIndex(
    (player) => player._id === home.player._id
  );
  const homePlayer = record.teams.home.players[homePlayerIndex];
  const homeTeam = record.teams.home;
  const awayTeam = record.teams.away;

  if (win) {
    if (homePlayerIndex !== -1) {
      homePlayer.stats[setIndex][home.type].success += 1;
    }
    homeTeam.stats[setIndex][home.type].success += 1;
    awayTeam.stats[setIndex][away.type].error += 1;
  } else {
    if (homePlayerIndex !== -1) {
      homePlayer.stats[setIndex][home.type].error += 1;
    }
    homeTeam.stats[setIndex][home.type].error += 1;
    awayTeam.stats[setIndex][away.type].success += 1;
  }
};

const updateRotation = (record: Record, setIndex: number) => {
  const set = record.sets[setIndex];
  let rotation = 0;
  let isServing = set.options.serve === "home";
  for (const entry of set.entries) {
    if (entry.type !== EntryType.RALLY) continue;
    const rally = entry.data as Rally;
    if (rally.win && !isServing) rotation += 1;
    isServing = rally.win;
  }
  record.teams.home.stats[setIndex].rotation = rotation;
};

const processMatchPhase = (
  record: Record,
  setIndex: number,
  entryIndex: number,
  recording: Rally
) => {
  const phase = matchPhaseHelper(record, setIndex, entryIndex + 1);

  if (phase.inProgress) {
    // Reset win status if the set/match is still in progress
    if (typeof record.sets[setIndex].win === "boolean") {
      record.sets[setIndex].win = null;
    }
    if (typeof record.win === "boolean") record.win = null;
  } else {
    // Set is complete, determine winners
    const { home, away } = recording;
    record.sets[setIndex].win = home.score > away.score;

    // If the match is finished, calculate the overall match result
    const homeSetsWonCount = record.sets.filter((set) => set.win).length;
    const awaySetsWonCount = record.sets.filter(
      (set) => set.win === false
    ).length;
    const setsCount = record.info.scoring.setCount;

    if (homeSetsWonCount > setsCount / 2 || awaySetsWonCount > setsCount / 2) {
      record.win = homeSetsWonCount > awaySetsWonCount;
    }
  }

  return phase;
};
