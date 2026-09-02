import type {
  GameView,
  PendingWritesState,
  PersistedPendingEntry,
  WriteError,
} from "@/lib/features/game/types";

/**
 * The one standard for whether another attempt is worth making. The flush, the
 * restore and the expiry rule all read it.
 */
export const isRetryableStatus = (status: number): boolean => status >= 500;

/** The same standard, over an entry that may not have failed yet. */
export const mayBeAttemptedAgain = (lastError?: WriteError): boolean =>
  lastError === undefined || isRetryableStatus(lastError.status);

export type SyncStatus =
  "unwritable" | "synced" | "failed" | "unsent" | "syncing";

/** Two, so the failure outlived the first background retry. */
export const PENDING_WRITE_UNSENT_ATTEMPTS = 2;

/**
 * Worst possibility first, first match wins -- the order is the design, not an
 * implementation detail, so keep it. `storageUnavailable` outranks the empty
 * queue because it is the one input that does not come from queue contents.
 * See honest-sync-status D1 and D3.
 */
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

/** True while this entry has an attempt scheduled (in-request or background). */
export const isPendingWrite = (
  state: PendingWritesState,
  entryId: string,
): boolean =>
  state.pending.some((p) => p.entry.id === entryId && p.nextAttemptAt !== null);

/**
 * Two immediate retries happen inline inside a single flush (300ms, 800ms)
 * before it reports failure. Once those are exhausted, the queue schedules a
 * longer background backoff (2s, 5s, 15s) between flushes, indexed by the
 * entry's attempt count after that failed flush. Past the end of the table
 * the budget is exhausted and the entry stops retrying on its own until a
 * manual retry.
 */
export const PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS = [300, 800];
export const PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS = [2000, 5000, 15000];

export const nextAttemptDelayMs = (attempts: number): number | null =>
  PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS[attempts - 1] ?? null;

/** Applies a flush response's confirmed entries onto the cached game. */
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

/**
 * How long a queued entry that cannot succeed is kept. Seven days has no
 * measured basis: it restores the exit persistence removed -- closing the app,
 * which used to empty a queue that lived in memory -- and nothing more. See D2.
 */
export const PENDING_WRITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/** Whether a restored entry should be dropped rather than put back. */
export const hasExpired = (item: PersistedPendingEntry, now: number): boolean =>
  !mayBeAttemptedAgain(item.lastError) &&
  item.firstFailedAt !== undefined &&
  now - item.firstFailedAt > PENDING_WRITE_EXPIRY_MS;
