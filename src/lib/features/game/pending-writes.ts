import type { PendingWritesState } from "@/lib/features/game/types";

export type SyncStatus = "synced" | "syncing" | "unsynced";

/**
 * D4: SyncIndicator and the per-row failure marker are both projections of
 * the queue, never stored state of their own. Empty reads as synced; any
 * item with a scheduled attempt reads as syncing; a queue whose items have
 * all exhausted their backoff reads as unsynced.
 */
export const deriveSyncStatus = (state: PendingWritesState): SyncStatus =>
  state.pending.length === 0
    ? "synced"
    : state.flushing || state.pending.some((p) => p.nextAttemptAt !== null)
      ? "syncing"
      : "unsynced";

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
 * D2: two immediate retries happen inline inside a single flush (300ms,
 * 800ms) before it reports failure. Once those are exhausted, the queue
 * schedules a longer background backoff (2s, 5s, 15s) between flushes,
 * indexed by the entry's attempt count after that failed flush. Past the
 * end of the table the budget is exhausted and the entry stops retrying on
 * its own until a manual retry.
 */
export const PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS = [300, 800];
export const PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS = [2000, 5000, 15000];

export const nextAttemptDelayMs = (attempts: number): number | null =>
  PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS[attempts - 1] ?? null;
