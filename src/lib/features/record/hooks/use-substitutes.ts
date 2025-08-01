import type { Record } from "@/entities/record";
import { useRecord } from "@/hooks/use-data";
import type { ReduxRecording } from "@/lib/features/record/types";

export const useSubstitutes = (
  recordId: string,
  state: { setIndex: number; entryIndex: number; recording: ReduxRecording },
) => {
  const { record } = useRecord(recordId);
  const { setIndex, entryIndex, recording } = state;

  const substitutes =
    entryIndex === record.sets[setIndex].entries.length
      ? gerGeneralModeSubstitutes(record, recording, setIndex)
      : getEditingModeSubstitutes(record, recording, setIndex, entryIndex);

  return substitutes;
};

// 取得一般模式下的替補球員清單
const gerGeneralModeSubstitutes = (
  record: Record,
  recording: ReduxRecording,
  setIndex: number,
) => {
  const { starting, substitutes } = record.sets[setIndex].lineups.home;
  const { players } = record.teams.home;
  const startingId = recording.home.player._id;

  const player = starting.find((p) => p._id === startingId);

  // 若此位置之球員已替補兩次，則無法再進行替補
  if (player?.sub?.entryIndex?.out) return [];

  // 若是替補球員，只能與原本的球員互換
  if (player?.sub?.entryIndex?.in) {
    return [players.find((p) => p._id === player.sub._id)];
  }

  // 取得可替補球員清單
  const usedIds = new Set([
    ...starting.map((p) => p._id),
    ...starting.map((p) => p?.sub?._id).filter(Boolean),
  ]);

  return substitutes
    .filter((sub) => !usedIds.has(sub._id))
    .map((sub) => players.find((p) => p._id === sub._id));
};

// 取得編輯模式下的替補球員清單
const getEditingModeSubstitutes = (
  record: Record,
  recording: ReduxRecording,
  setIndex: number,
  entryIndex: number,
) => {
  const { starting, substitutes } = record.sets[setIndex].lineups.home;
  const { players } = record.teams.home;
  const startingId = recording.home.player._id;

  // 找出目前選取的球員
  const player =
    starting.find((p) => p._id === startingId) ||
    starting.find((p) => p?.sub?._id === startingId);

  if (!player) return [];

  const { sub } = player;

  // 檢查此位置是否已使用完兩次替補
  if (sub?.entryIndex?.out && sub.entryIndex.out < entryIndex) return [];

  // 若所編輯的時間點為替補狀態，則只能與原本的球員互換
  if (sub?.entryIndex?.in < entryIndex) {
    return [
      players.find(
        (p) => p._id === (sub.entryIndex.out ? player._id : sub._id),
      ),
    ];
  }

  // 處理一般球員替補
  const usedIds = new Set([
    ...starting.map((p) => p._id),
    ...starting.map((p) => p?.sub?._id).filter(Boolean),
  ]);

  const availablePlayers = substitutes
    .filter((sub) => !usedIds.has(sub._id))
    .map((s) => s._id);

  if (sub?.entryIndex?.in) availablePlayers.push(player._id);

  return availablePlayers.map((id) => players.find((p) => p._id === id));
};
