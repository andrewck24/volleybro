import { EntryType } from "@/entities/game";
import { useGame } from "@/hooks/use-data";
import type { GameView, ReduxStatus } from "@/lib/features/game/types";
import type { LineupView } from "@/lib/features/team/types";

export const useLineup = (
  gameId: string,
  setIndex: number,
  status: ReduxStatus,
) => {
  const { entryIndex, isServing, inProgress } = status;
  const { game } = useGame(gameId);

  if (!inProgress || !game) return { starting: [], liberos: [] };

  const set = game.sets[setIndex];
  if (!set) return { starting: [], liberos: [] };
  const { entries, lineups } = set;

  const lineup =
    entryIndex === entries.length
      ? getGeneralModeLineup(game, setIndex)
      : getEditingModeLineup(game, setIndex, entryIndex);

  const switchTargetIndex = lineup.starting.findIndex(
    (player, index) =>
      player.position === lineups.home.options.liberoReplacePosition &&
      ((index === 0 && !isServing) || index >= 4),
  );
  const libero = lineup.liberos[0];
  const target = lineup.starting[switchTargetIndex];
  if (switchTargetIndex !== -1 && libero && target) {
    const switchTarget = { ...target };
    lineup.starting[switchTargetIndex] = libero;
    lineup.liberos[0] = switchTarget;
  }

  return lineup;
};

const getGeneralModeLineup = (game: GameView, setIndex: number) => {
  // called only after useLineup confirms the set exists
  const { starting, liberos } = structuredClone(
    game.sets[setIndex]!.lineups.home,
  );
  const { players, stats } = game.teams.home;
  const lineup = {
    liberos: liberos.map((libero) => {
      const player = players.find((p) => p.id === libero.id);
      const substitute = players.find((p) => p.id === libero?.sub?.id);
      return {
        ...player,
        position: libero.position,
        sub: {
          id: substitute?.id,
          number: substitute?.number,
          entryIndex: libero?.sub?.entryIndex,
        },
      };
    }),
    starting: starting.map((starter) => {
      const player = players.find((p) => p.id === starter.id);
      const substitute = players.find((p) => p.id === starter?.sub?.id);
      return {
        ...player,
        position: starter.position,
        sub: {
          id: substitute?.id,
          number: substitute?.number,
          entryIndex: starter?.sub?.entryIndex,
        },
      };
    }),
  };

  const rotation = stats[setIndex]!.rotation % 6;
  if (rotation) {
    const rotatedPlayers = lineup.starting.splice(0, rotation);
    lineup.starting.push(...rotatedPlayers);
  }

  return lineup;
};

const getEditingModeLineup = (
  game: GameView,
  setIndex: number,
  entryIndex: number,
) => {
  const { players } = game.teams.home;
  // called only after useLineup confirms the set exists
  const set = game.sets[setIndex]!;

  // Calculate serving and rotation
  const { rotation } = set.entries.slice(0, entryIndex).reduce(
    (acc, entry) => {
      if (entry.type === EntryType.RALLY && entry.win !== acc.isServing) {
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

  const mapPlayer = (player: LineupView["starting"][number]) => {
    // Whether this player has been substituted in the game
    const hasSub = (player?.sub?.entryIndex?.in ?? Infinity) < entryIndex;
    // Current game state shows this player is a substitute
    const isSub =
      player?.sub?.entryIndex?.in !== undefined &&
      !player?.sub?.entryIndex?.out;
    // At the editing point, this player was a substitute
    const wasSub =
      (player?.sub?.entryIndex?.in ?? Infinity) < entryIndex &&
      (!player?.sub?.entryIndex?.out ||
        player?.sub?.entryIndex?.out >= entryIndex);
    // When a player (LineupPlayer) is substituted, their id and sub.id are swapped
    // So when isSub and wasSub are the same, it means no need to swap id and sub.id
    const toSwap = isSub === wasSub;

    const mainPlayer = players.find(
      (p) => p.id === (toSwap ? player.id : player?.sub?.id),
    );
    const subPlayer = players.find(
      (p) => p.id === (hasSub && (toSwap ? player?.sub?.id : player.id)),
    );

    return {
      ...mainPlayer,
      position: player.position,
      sub: {
        id: subPlayer?.id ?? null,
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
