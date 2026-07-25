import { useGame } from "@/hooks/use-data";
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
      ? gerGeneralModeSubstitutes(game, entryDraft, setIndex)
      : getEditingModeSubstitutes(game, entryDraft, setIndex, entryIndex);

  return substitutes.filter((s): s is NonNullable<typeof s> => s != null);
};

// 取得一般模式下的替補球員清單
const gerGeneralModeSubstitutes = (
  game: GameView,
  entryDraft: ReduxEntryDraft,
  setIndex: number,
) => {
  // setIndex references the active set being recorded; guaranteed in bounds
  const { starting, substitutes } = game.sets[setIndex]!.lineups.home;
  const { players } = game.teams.home;
  const startingId = entryDraft.home.player?.id;

  const player = starting.find((p) => p.id === startingId);

  // 若此位置之球員已替補兩次，則無法再進行替補
  if (player?.sub?.entryIndex?.out) return [];

  // 若是替補球員，只能與原本的球員互換
  if (player?.sub?.entryIndex?.in) {
    return [players.find((p) => p.id === player.sub?.id)];
  }

  // 取得可替補球員清單
  const usedIds = new Set([
    ...starting.map((p) => p.id),
    ...starting.map((p) => p?.sub?.id).filter(Boolean),
  ]);

  return substitutes
    .filter((sub) => !usedIds.has(sub.id))
    .map((sub) => players.find((p) => p.id === sub.id));
};

// 取得編輯模式下的替補球員清單
const getEditingModeSubstitutes = (
  game: GameView,
  entryDraft: ReduxEntryDraft,
  setIndex: number,
  entryIndex: number,
) => {
  // setIndex references the active set being recorded; guaranteed in bounds
  const { starting, substitutes } = game.sets[setIndex]!.lineups.home;
  const { players } = game.teams.home;
  const startingId = entryDraft.home.player?.id;

  // 找出目前選取的球員
  const player =
    starting.find((p) => p.id === startingId) ||
    starting.find((p) => p?.sub?.id === startingId);

  if (!player) return [];

  const { sub } = player;

  // 檢查此位置是否已使用完兩次替補
  if (sub?.entryIndex?.out && sub.entryIndex.out < entryIndex) return [];

  // 若所編輯的時間點為替補狀態，則只能與原本的球員互換
  if ((sub?.entryIndex?.in ?? Infinity) < entryIndex) {
    return [
      players.find(
        (p) => p.id === (sub?.entryIndex?.out ? player.id : sub?.id),
      ),
    ];
  }

  // 處理一般球員替補
  const usedIds = new Set([
    ...starting.map((p) => p.id),
    ...starting.map((p) => p?.sub?.id).filter(Boolean),
  ]);

  const availablePlayers = substitutes
    .filter((sub) => !usedIds.has(sub.id))
    .map((s) => s.id);

  if (sub?.entryIndex?.in) availablePlayers.push(player.id);

  return availablePlayers.map((id) => players.find((p) => p.id === id));
};
