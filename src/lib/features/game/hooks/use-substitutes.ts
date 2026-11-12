import { useGame } from "@/hooks/use-data";
import { seqAt } from "@/lib/features/game/helpers";
import type { GameView, ReduxEntryDraft } from "@/lib/features/game/types";

export const useSubstitutes = (
  gameId: string,
  state: { setIndex: number; entryIndex: number; entryDraft: ReduxEntryDraft },
) => {
  const { game } = useGame(gameId);
  const { setIndex, entryIndex, entryDraft } = state;

  if (!game) return [];

  const substitutes =
    entryIndex === game.sets[setIndex]?.entries.length
      ? getGeneralModeSubstitutes(game, entryDraft, setIndex)
      : getEditingModeSubstitutes(
          game,
          entryDraft,
          setIndex,
          seqAt(game.sets[setIndex]!.entries, entryIndex),
        );

  return substitutes.filter((s): s is NonNullable<typeof s> => s != null);
};

const getGeneralModeSubstitutes = (
  game: GameView,
  entryDraft: ReduxEntryDraft,
  setIndex: number,
) => {
  const { starting, substitutes } = game.sets[setIndex]!.lineups.home;
  const { players } = game.teams.home;
  const startingId = entryDraft.home.player?.id;

  const player = starting.find((p) => p.id === startingId);

  if (player?.sub?.entryIndex?.out !== undefined) return [];

  if (player?.sub?.entryIndex?.in !== undefined) {
    return [players.find((p) => p.id === player.sub?.id)];
  }

  const usedIds = new Set([
    ...starting.map((p) => p.id),
    ...starting.map((p) => p?.sub?.id).filter(Boolean),
  ]);

  return substitutes
    .filter((sub) => !usedIds.has(sub.id))
    .map((sub) => players.find((p) => p.id === sub.id));
};

const getEditingModeSubstitutes = (
  game: GameView,
  entryDraft: ReduxEntryDraft,
  setIndex: number,
  seq: number,
) => {
  const { starting, substitutes } = game.sets[setIndex]!.lineups.home;
  const { players } = game.teams.home;
  const startingId = entryDraft.home.player?.id;

  const player =
    starting.find((p) => p.id === startingId) ||
    starting.find((p) => p?.sub?.id === startingId);

  if (!player) return [];

  const { sub } = player;

  if ((sub?.entryIndex?.out ?? Infinity) < seq) return [];

  if ((sub?.entryIndex?.in ?? Infinity) < seq) {
    return [
      players.find(
        (p) =>
          p.id === (sub?.entryIndex?.out !== undefined ? player.id : sub?.id),
      ),
    ];
  }

  const usedIds = new Set([
    ...starting.map((p) => p.id),
    ...starting.map((p) => p?.sub?.id).filter(Boolean),
  ]);

  const availablePlayers = substitutes
    .filter((sub) => !usedIds.has(sub.id))
    .map((s) => s.id);

  if (sub?.entryIndex?.in !== undefined)
    availablePlayers.push(
      sub.entryIndex.out !== undefined ? sub.id : player.id,
    );

  return availablePlayers.map((id) => players.find((p) => p.id === id));
};
