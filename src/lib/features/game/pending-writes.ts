import type {
  GameView,
  PendingWritesState,
  PersistedPendingEntry,
  WriteError,
} from "@/lib/features/game/types";

/**
 * The one standard for whether another attempt is worth making. The flush, the
 * restore and the expiry rule all read it, so none of them can disagree about
 * which failures are worth carrying.
 */
export const isRetryableStatus = (status: number): boolean => status >= 500;

/** The same standard, over an entry that may not have failed yet. */
export const mayBeAttemptedAgain = (lastError?: WriteError): boolean =>
  lastError === undefined || isRetryableStatus(lastError.status);

export type SyncStatus =
  "unwritable" | "synced" | "failed" | "unsent" | "syncing";

/**
 * How many measured failures an entry needs before the queue stops reading as
 * work in progress. One failure is a blip -- the first background retry is 2s
 * away and usually succeeds. Two means the failure outlived that retry, which
 * offline and an unreachable server both do and a hiccup does not. Counted
 * rather than timed: `attempts` rises by dispatch, so the status turns over on
 * its own without a timer to schedule and clean up.
 */
export const PENDING_WRITE_UNSENT_ATTEMPTS = 2;

/**
 * SyncIndicator and the per-row failure marker are both projections of the
 * queue, never stored state of their own.
 *
 * Five conditions, worst possibility first, and the first match wins. The
 * order is the design: every gate stands for a higher risk than the one below
 * it, so nothing uncertain can be reported as the most optimistic answer.
 * `syncing` sits last for that reason -- a spinner promises "this finishes
 * shortly", and it is only allowed where that promise holds.
 *
 * An unwritable store outranks an empty queue because "hidden" means no risk,
 * not no queue: work recorded from here will not survive the app being
 * reclaimed, whether or not anything is queued yet. Note this is the one input
 * that does not come from queue contents.
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
 * Whether this entry's row should carry the failure marker. The same judgement
 * the indicator's warning tone uses, so the two cannot disagree about one
 * entry. An exhausted backoff is deliberately not enough: those entries ride
 * out on the next rally's flush or on reconnect, and marking a row destructive
 * for work that heals itself is the per-row version of the over-warning this
 * Change removes -- offline it would redden most of the list.
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
