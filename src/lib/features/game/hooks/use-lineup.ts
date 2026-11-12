import { deriveSetStats } from "@/entities/game";
import { useGame } from "@/hooks/use-data";
import { seqAt } from "@/lib/features/game/helpers";
import type { GameView, ReduxStatus } from "@/lib/features/game/types";
import type { LineupView } from "@/lib/features/team/types";

export const useLineup = (
  gameId: string,
  setIndex: number,
  status: ReduxStatus,
) => {
  const { entryIndex, isServing, isSetInProgress } = status;
  const { game } = useGame(gameId);

  if (!isSetInProgress || !game) return { starting: [], liberos: [] };

  const set = game.sets[setIndex];
  if (!set) return { starting: [], liberos: [] };
  const { entries, lineups } = set;

  const lineup =
    entryIndex === entries.length
      ? getGeneralModeLineup(game, set)
      : getEditingModeLineup(game, set, entryIndex);

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

const getGeneralModeLineup = (
  game: GameView,
  set: GameView["sets"][number],
) => {
  const { starting, liberos } = structuredClone(set.lineups.home);
  const { players } = game.teams.home;
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

  const { rotation: usedRotation } = deriveSetStats(set.entries, {
    options: set.options,
  }).home;
  const rotation = usedRotation % 6;
  if (rotation) {
    const rotatedPlayers = lineup.starting.splice(0, rotation);
    lineup.starting.push(...rotatedPlayers);
  }

  return lineup;
};

const getEditingModeLineup = (
  game: GameView,
  set: GameView["sets"][number],
  entryIndex: number,
) => {
  const { players } = game.teams.home;

  const { rotation: usedRotation } = deriveSetStats(
    set.entries.slice(0, entryIndex),
    { options: set.options },
  ).home;
  const rotation = usedRotation % 6;
  const seq = seqAt(set.entries, entryIndex);

  const { starting, liberos } = structuredClone(set.lineups.home);

  const mapPlayer = (player: LineupView["starting"][number]) => {
    const hasEnteredByEditPoint =
      (player?.sub?.entryIndex?.in ?? Infinity) < seq;
    const isCurrentSubstitute =
      player?.sub?.entryIndex?.in !== undefined &&
      player?.sub?.entryIndex?.out === undefined;
    const wasSubstituteAtEditPoint =
      (player?.sub?.entryIndex?.in ?? Infinity) < seq &&
      (player?.sub?.entryIndex?.out ?? Infinity) >= seq;
    const toSwap = isCurrentSubstitute === wasSubstituteAtEditPoint;

    const mainPlayer = players.find(
      (p) => p.id === (toSwap ? player.id : player?.sub?.id),
    );
    const subPlayer = players.find(
      (p) =>
        p.id ===
        (hasEnteredByEditPoint && (toSwap ? player?.sub?.id : player.id)),
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
