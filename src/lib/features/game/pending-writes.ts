import { EntryType, upsertEntries } from "@/entities/game";
import type {
  GameView,
  PendingEntry,
  PendingWritesState,
  PersistedPendingEntry,
  WriteError,
} from "@/lib/features/game/types";

// The flush, the restore and the expiry rule all read this one standard.
export const isRetryableStatus = (status: number): boolean => status >= 500;

export const mayBeAttemptedAgain = (lastError?: WriteError): boolean =>
  lastError === undefined || isRetryableStatus(lastError.status);

export type SyncStatus =
  "unwritable" | "synced" | "failed" | "unsent" | "syncing";

export const PENDING_WRITE_UNSENT_ATTEMPTS = 2;

export const deriveSyncStatus = (
  state: PendingWritesState,
  gameId: string,
): SyncStatus => {
  if (state.storageUnavailable) return "unwritable";

  const pending = state.pending.filter((p) => p.gameId === gameId);
  if (pending.length === 0) return "synced";
  if (pending.some((p) => !mayBeAttemptedAgain(p.lastError))) return "failed";
  if (pending.some((p) => p.attempts >= PENDING_WRITE_UNSENT_ATTEMPTS))
    return "unsent";
  return "syncing";
};

/**
 * Deliberately the same judgement as the indicator's warning tone, so the two
 * cannot disagree about one entry. An exhausted backoff is not enough.
 */
export const hasFailedWrite = (
  state: PendingWritesState,
  entryId: string,
): boolean =>
  state.pending.some(
    (p) => p.entry.id === entryId && !mayBeAttemptedAgain(p.lastError),
  );

export const isPendingWrite = (
  state: PendingWritesState,
  entryId: string,
): boolean =>
  state.pending.some((p) => p.entry.id === entryId && p.nextAttemptAt !== null);

export const PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS = [300, 800];
export const PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS = [2000, 5000, 15000];

export const nextAttemptDelayMs = (attempts: number): number | null =>
  PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS[attempts - 1] ?? null;

export const applyFlushedEntries = (
  game: GameView | undefined,
  setIndex: number,
  entries: GameView["sets"][number]["entries"],
): GameView | undefined =>
  game && {
    ...game,
    sets: game.sets.map((set, i) =>
      i === setIndex ? { ...set, entries } : set,
    ),
  };

export const mergePendingEntries = (
  game: GameView | undefined,
  pending: readonly PendingEntry[],
  gameId: string,
): GameView | undefined => {
  if (!game) return game;

  const bySet = new Map<number, PendingEntry[]>();
  for (const item of pending) {
    if (item.gameId !== gameId) continue;
    const group = bySet.get(item.setIndex);
    if (group) group.push(item);
    else bySet.set(item.setIndex, [item]);
  }
  if (bySet.size === 0) return game;

  return {
    ...game,
    sets: game.sets.map((set, setIndex) => {
      const group = bySet.get(setIndex);
      if (!group) return set;

      return {
        ...set,
        entries: upsertEntries(
          set.entries,
          group.map(({ entry }) => ({ type: EntryType.RALLY, ...entry })),
        ),
      };
    }),
  };
};

/**
 * How long a queued entry that cannot succeed is kept. Seven days has no
 * measured basis: it restores the exit persistence removed -- closing the app,
 * which used to empty a queue that lived in memory -- and nothing more. See D2.
 */
export const PENDING_WRITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export const hasExpired = (item: PersistedPendingEntry, now: number): boolean =>
  !mayBeAttemptedAgain(item.lastError) &&
  item.firstFailedAt !== undefined &&
  now - item.firstFailedAt > PENDING_WRITE_EXPIRY_MS;
