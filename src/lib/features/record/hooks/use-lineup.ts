import { type Record, EntryType, Rally } from "@/entities/record";
import { type LineupPlayer } from "@/entities/team";
import { useRecord } from "@/hooks/use-data";
import type { ReduxStatus } from "@/lib/features/record/types";

export const useLineup = (
  recordId: string,
  setIndex: number,
  status: ReduxStatus,
) => {
  const { entryIndex, isServing, inProgress } = status;
  const { record } = useRecord(recordId);

  if (!inProgress) return { starting: [], liberos: [] };

  const { entries, lineups } = record.sets[setIndex];

  const lineup =
    entryIndex === entries.length
      ? getGeneralModeLineup(record, setIndex)
      : getEditingModeLineup(record, setIndex, entryIndex);

  const switchTargetIndex = lineup.starting.findIndex(
    (player, index) =>
      player.position === lineups.home.options.liberoReplacePosition &&
      ((index === 0 && !isServing) || index >= 4),
  );
  if (switchTargetIndex !== -1) {
    const switchTarget = {
      ...lineup.starting[switchTargetIndex],
    };
    lineup.starting[switchTargetIndex] = lineup.liberos[0];
    lineup.liberos[0] = switchTarget;
  }

  return lineup;
};

const getGeneralModeLineup = (record: Record, setIndex: number) => {
  const { starting, liberos } = structuredClone(
    record.sets[setIndex].lineups.home,
  );
  const { players, stats } = record.teams.home;
  const lineup = {
    liberos: liberos.map((libero) => {
      const player = players.find((p) => p._id === libero._id);
      const substitute = players.find((p) => p._id === libero?.sub?._id);
      return {
        ...player,
        position: libero.position,
        sub: {
          _id: substitute?._id,
          number: substitute?.number,
          entryIndex: libero?.sub?.entryIndex,
        },
      };
    }),
    starting: starting.map((starter) => {
      const player = players.find((p) => p._id === starter._id);
      const substitute = players.find((p) => p._id === starter?.sub?._id);
      return {
        ...player,
        position: starter.position,
        sub: {
          _id: substitute?._id,
          number: substitute?.number,
          entryIndex: starter?.sub?.entryIndex,
        },
      };
    }),
  };

  const rotation = stats[setIndex].rotation % 6;
  if (rotation) {
    const rotatedPlayers = lineup.starting.splice(0, rotation);
    lineup.starting.push(...rotatedPlayers);
  }

  return lineup;
};

const getEditingModeLineup = (
  record: Record,
  setIndex: number,
  entryIndex: number,
) => {
  const { players } = record.teams.home;
  const set = record.sets[setIndex];

  // Calculate serving and rotation
  const { rotation } = set.entries.slice(0, entryIndex).reduce(
    (acc, entry) => {
      if (
        entry.type === EntryType.RALLY &&
        (entry.data as Rally)?.win !== acc.isServing
      ) {
        return {
          isServing: !acc.isServing,
          rotation: (acc.rotation + 1) % 6,
        };
      }
      return acc;
    },
    { isServing: set.options.serve === "home", rotation: 0 },
  );

  const { starting, liberos } = structuredClone(set.lineups.home);

  const mapPlayer = (player: LineupPlayer) => {
    // Whether this player has been substituted in the game
    const hasSub = player?.sub?.entryIndex?.in < entryIndex;
    // Current game state shows this player is a substitute
    const isSub =
      player?.sub?.entryIndex?.in !== undefined &&
      !player?.sub?.entryIndex?.out;
    // At the editing point, this player was a substitute
    const wasSub =
      player?.sub?.entryIndex?.in < entryIndex &&
      (!player?.sub?.entryIndex?.out ||
        player?.sub?.entryIndex?.out >= entryIndex);
    // When a player (LineupPlayer) is substituted, their _id and sub._id are swapped
    // So when isSub and wasSub are the same, it means no need to swap _id and sub._id
    const toSwap = isSub === wasSub;

    const mainPlayer = players.find(
      (p) => p._id === (toSwap ? player._id : player?.sub?._id),
    );
    const subPlayer = players.find(
      (p) => p._id === (hasSub && (toSwap ? player?.sub?._id : player._id)),
    );

    return {
      ...mainPlayer,
      position: player.position,
      sub: {
        _id: subPlayer?._id,
        number: subPlayer?.number,
        entryIndex: player?.sub?.entryIndex,
      },
    };
  };

  const lineup = {
    liberos: liberos.map(mapPlayer),
    starting: starting.map(mapPlayer),
  };

  if (rotation) {
    const rotatedPlayers = lineup.starting.splice(0, rotation);
    lineup.starting.push(...rotatedPlayers);
  }

  return lineup;
};
