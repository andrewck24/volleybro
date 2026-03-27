import {
  type Record,
  type Substitution,
  PlayerStatsClass,
  Side,
  createSubstitutionEntry,
} from "@/entities/record";

export const createSubstitutionHelper = (
  params: { recordId: string; setIndex: number; entryIndex: number },
  substitution: Substitution,
  record: Record,
) => {
  const { setIndex, entryIndex } = params;
  const side = substitution.team === Side.HOME ? "home" : "away";
  const lineup = record.sets[setIndex].lineups[side]!;

  // Update lineup
  const startingIndex = lineup.starting.findIndex(
    (p) => p._id?.toString() === substitution.players.out,
  );
  const subIndex = lineup.substitutes.findIndex(
    (p) => p._id?.toString() === substitution.players.in,
  );

  lineup.starting[startingIndex] = {
    _id: substitution.players.in,
    position: lineup.starting[startingIndex].position,
    sub: {
      _id: substitution.players.out,
      entryIndex:
        lineup.starting[startingIndex].sub?.entryIndex?.in !== undefined
          ? {
              ...lineup.starting[startingIndex].sub.entryIndex,
              out: entryIndex,
            }
          : { in: entryIndex },
    },
  };

  lineup.substitutes[subIndex] = {
    ...lineup.substitutes[subIndex],
    _id: substitution.players.out,
    sub: {
      _id: substitution.players.in,
      entryIndex:
        lineup.substitutes[subIndex].sub?.entryIndex?.in !== undefined
          ? {
              ...lineup.substitutes[subIndex].sub.entryIndex,
              out: entryIndex,
            }
          : { in: entryIndex },
    },
  };

  // Update record stats
  const startingPlayer = lineup.starting.find(
    (p) => p._id?.toString() === substitution.players.in,
  );
  if (startingPlayer?.sub?.entryIndex?.in !== undefined) {
    const player = record.teams[side].players.find(
      (p) => p._id.toString() === substitution.players.in,
    );
    if (player) player.stats[setIndex] = new PlayerStatsClass();
  }

  record.teams[side].stats[setIndex].substitution++;
  record.sets[setIndex].entries[entryIndex] =
    createSubstitutionEntry(substitution);

  return record;
};
