import { useRecord } from "@/hooks/use-data";
import { type LineupPlayer } from "@/entities/team";
import { type Record, EntryType, Rally } from "@/entities/record";
import type { ReduxStatus } from "@/lib/features/record/types";

const getGeneralModeLineup = (record: Record, status: ReduxStatus) => {
  const { setIndex } = status;
  const { starting, liberos } = structuredClone(
    record.sets[setIndex].lineups.home
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
          rallyIndex: libero?.sub?.rallyIndex,
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
          rallyIndex: starter?.sub?.rallyIndex,
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

const getEditingModeLineup = (record: Record, status: ReduxStatus) => {
  const { setIndex, rallyIndex } = status;
  const { players } = record.teams.home;
  const set = record.sets[setIndex];

  // Calculate serving and rotation
  const { rotation } = set.rallies.slice(0, rallyIndex).reduce(
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
    { isServing: set.options.serve === "home", rotation: 0 }
  );

  const { starting, liberos } = structuredClone(set.lineups.home);

  const mapPlayer = (player: LineupPlayer) => {
    // Whether this player has been substituted in the game
    const hasSub = player?.sub?.rallyIndex?.in < rallyIndex;
    // Current game state shows this player is a substitute
    const isSub =
      player?.sub?.rallyIndex?.in !== undefined &&
      !player?.sub?.rallyIndex?.out;
    // At the editing point, this player was a substitute
    const wasSub =
      player?.sub?.rallyIndex?.in < rallyIndex &&
      (!player?.sub?.rallyIndex?.out ||
        player?.sub?.rallyIndex?.out >= rallyIndex);
    // When a player (LineupPlayer) is substituted, their _id and sub._id are swapped
    // So when isSub and wasSub are the same, it means no need to swap _id and sub._id
    const toSwap = isSub === wasSub;

    const mainPlayer = players.find(
      (p) => p._id === (toSwap ? player._id : player?.sub?._id)
    );
    const subPlayer = players.find(
      (p) => p._id === (hasSub && (toSwap ? player?.sub?._id : player._id))
    );

    return {
      ...mainPlayer,
      position: player.position,
      sub: {
        _id: subPlayer?._id,
        number: subPlayer?.number,
        rallyIndex: player?.sub?.rallyIndex,
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

export const useLineup = (recordId: string, status: ReduxStatus) => {
  const { setIndex, rallyIndex, isServing, inProgress } = status;
  const { record } = useRecord(recordId);

  if (!inProgress) return { starting: [], liberos: [] };

  const { rallies, lineups } = record.sets[setIndex];

  const lineup =
    rallyIndex === rallies.length
      ? getGeneralModeLineup(record, status)
      : getEditingModeLineup(record, status);

  const switchTargetIndex = lineup.starting.findIndex(
    (player, index) =>
      player.position === lineups.home.options.liberoReplacePosition &&
      ((index === 0 && !isServing) || index >= 4)
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
