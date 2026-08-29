import type {
  GameView,
  PendingWritesState,
  PersistedPendingEntry,
  WriteError,
} from "@/lib/features/game/types";

export type SyncStatus = "synced" | "syncing" | "unsynced";

/**
 * SyncIndicator and the per-row failure marker are both projections of the
 * queue, never stored state of their own. Empty reads as synced; any item
 * with a scheduled attempt reads as syncing; a queue whose items have all
 * exhausted their backoff reads as unsynced. Scoped to one game: a flush
 * carries its own game identity now, so another game's in-flight flush
 * never gets mistaken for this game's.
 */
export const deriveSyncStatus = (
  state: PendingWritesState,
  gameId: string,
): SyncStatus => {
  const pending = state.pending.filter((p) => p.gameId === gameId);
  return pending.length === 0
    ? "synced"
    : state.flushingGameIds.includes(gameId) ||
        pending.some((p) => p.nextAttemptAt !== null)
      ? "syncing"
      : "unsynced";
};

export const hasFailedWrite = (
  state: PendingWritesState,
  entryId: string,
): boolean =>
  state.pending.some((p) => p.entry.id === entryId && p.nextAttemptAt === null);

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

/**
 * The one threshold that decides whether a failure is worth another attempt.
 * Both the flush and the restore read it, because two copies would drift and
 * a drift here means entries that are never sent again.
 */
export const isRetryableStatus = (status: number): boolean => status >= 500;

/**
 * Whether a restored entry may be attempted again. Wider than the flush's
 * question by exactly one case: an expired session is not a permanent
 * failure, and because signing in leaves the app entirely and comes back as
 * a fresh start, a restart is often the very thing that fixed it. Anything
 * else in the 4xx range cannot be fixed by sending the same bytes again.
 */
export const isWorthAttemptingAgain = (lastError?: WriteError): boolean =>
  lastError === undefined ||
  isRetryableStatus(lastError.status) ||
  lastError.status === 401;

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
 * How long a queued entry that cannot succeed is kept before it is dropped.
 *
 * Persisting the queue removed the only exit such an entry had -- closing the
 * app, which used to empty a queue that lived in memory. Without something
 * like this, a game somebody deleted leaves an entry that can never be sent,
 * never be cleared, and after the recorder walks away from that game, never
 * even be seen. Seven days has no measured basis; it restores the property
 * persistence took away and nothing more.
 *
 * The proper fix is letting the recorder see the entry and discard it, which
 * needs unsent work to be visible outside the game it belongs to.
 */
export const PENDING_WRITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Whether a restored entry should be dropped rather than put back. Only ever
 * true for one whose last failure cannot be fixed by sending it again: work
 * that might still land is kept however long it has waited, because a week
 * without signal is exactly when the queue has to hold.
 */
export const hasExpired = (item: PersistedPendingEntry, now: number): boolean =>
  !isWorthAttemptingAgain(item.lastError) &&
  item.failedAt !== undefined &&
  now - item.failedAt > PENDING_WRITE_EXPIRY_MS;
