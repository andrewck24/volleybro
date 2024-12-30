import { type Record, type Rally, EntryType } from "@/entities/record";

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
      record.teams.home.players[homePlayerIndex] = homePlayer;
    }
    homeTeam.stats[setIndex][home.type].success -= 1;
    awayTeam.stats[setIndex][away.type].error -= 1;
  } else {
    if (homePlayerIndex !== -1) {
      homePlayer.stats[setIndex][home.type].error -= 1;
      record.teams.home.players[homePlayerIndex] = homePlayer;
    }
    homeTeam.stats[setIndex][home.type].error -= 1;
    awayTeam.stats[setIndex][away.type].success -= 1;
  }

  record.teams.home = homeTeam;
  record.teams.away = awayTeam;
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
      record.teams.home.players[homePlayerIndex] = homePlayer;
    }
    homeTeam.stats[setIndex][home.type].success += 1;
    awayTeam.stats[setIndex][away.type].error += 1;
  } else {
    if (homePlayerIndex !== -1) {
      homePlayer.stats[setIndex][home.type].error += 1;
      record.teams.home.players[homePlayerIndex] = homePlayer;
    }
    homeTeam.stats[setIndex][home.type].error += 1;
    awayTeam.stats[setIndex][away.type].success += 1;
  }

  record.teams.home = homeTeam;
  record.teams.away = awayTeam;
};

const updateRotation = (record: Record, setIndex: number) => {
  const set = record.sets[setIndex];
  let rotation = 0;
  let isServing = set.options.serve === "home";
  for (const entry of set.rallies) {
    if (entry.type !== EntryType.RALLY) continue;
    const rally = entry.data as Rally;
    if (rally.win && !isServing) rotation += 1;
    isServing = rally.win;
  }
  record.teams.home.stats[setIndex].rotation = rotation;
};

export const updateRallyOptimistic = (
  params: { recordId: string; setIndex: number; rallyIndex: number },
  recording: Rally,
  record: Record
) => {
  const { setIndex, rallyIndex } = params;
  const rallies = record.sets[setIndex].rallies;
  const originalEntry = rallies[rallyIndex];
  if (originalEntry.type !== EntryType.RALLY) {
    throw new Error("Entry is not a rally");
  }
  const originalRally = originalEntry.data as Rally;

  discardOriginalStats(record, setIndex, originalRally);
  updateStats(record, setIndex, recording);

  record.sets[setIndex].rallies[rallyIndex] = {
    type: EntryType.RALLY,
    data: recording,
  };

  // 若有更新 rally 之得分結果，則重新計算 rotation
  if (originalRally.win !== recording.win) updateRotation(record, setIndex);

  return record;
};
