import {
  type Record,
  type Substitution,
  Side,
  EntryType,
  PlayerStatsClass,
} from "@/entities/record";

export const createSubstitutionOptimistic = (
  params: { recordId: string; setIndex: number; rallyIndex: number },
  substitution: Substitution,
  record: Record
) => {
  const { setIndex, rallyIndex } = params;
  const side = substitution.team === Side.HOME ? "home" : "away";
  const lineup = record.sets[setIndex].lineups[side];

  // Update lineup
  const startingIndex = lineup.starting.findIndex(
    (p) => p._id.toString() === substitution.players.out
  );
  const subIndex = lineup.substitutes.findIndex(
    (p) => p._id.toString() === substitution.players.in
  );

  lineup.starting[startingIndex] = {
    _id: substitution.players.in,
    position: lineup.starting[startingIndex].position,
    sub: {
      _id: substitution.players.out,
      rallyIndex:
        lineup.starting[startingIndex].sub?.rallyIndex?.in !== undefined
          ? {
              ...lineup.starting[startingIndex].sub.rallyIndex,
              out: rallyIndex,
            }
          : { in: rallyIndex, out: null },
    },
  };

  lineup.substitutes[subIndex] = {
    ...lineup.substitutes[subIndex],
    _id: substitution.players.out,
    sub: {
      _id: substitution.players.in,
      rallyIndex:
        lineup.substitutes[subIndex].sub?.rallyIndex?.in !== undefined
          ? {
              ...lineup.substitutes[subIndex].sub.rallyIndex,
              out: rallyIndex,
            }
          : { in: rallyIndex, out: null },
    },
  };

  // Update record stats
  const startingPlayer = lineup.starting.find(
    (p) => p._id.toString() === substitution.players.in
  );
  if (!!startingPlayer.sub?.rallyIndex?.in !== undefined) {
    const player = record.teams[side].players.find(
      (p) => p._id.toString() === substitution.players.in
    );
    if (player) player.stats[setIndex] = new PlayerStatsClass();
  }

  record.teams[side].stats[setIndex].substitution++;
  record.sets[setIndex].entries[rallyIndex] = {
    type: EntryType.SUBSTITUTION,
    data: substitution,
  };

  return record;
};
