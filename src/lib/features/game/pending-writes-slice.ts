import {
  mayBeAttemptedAgain,
  nextAttemptDelayMs,
} from "@/lib/features/game/pending-writes";
import type {
  PendingEntry,
  PendingWritesState,
  PersistedPendingEntry,
  WriteError,
} from "@/lib/features/game/types";
import {
  createSlice,
  type CaseReducer,
  type PayloadAction,
} from "@reduxjs/toolkit";

const initialState: PendingWritesState = {
  pending: [],
  storageUnavailable: false,
};

const enqueued: CaseReducer<
  PendingWritesState,
  PayloadAction<Pick<PendingEntry, "entry" | "gameId" | "setIndex">>
> = (state, action) => {
  state.pending.push({
    ...action.payload,
    attempts: 0,
    nextAttemptAt: Date.now(),
  });
};

const flushSucceeded: CaseReducer<
  PendingWritesState,
  PayloadAction<{ gameId: string; ids: string[] }>
> = (state, action) => {
  const ids = new Set(action.payload.ids);
  state.pending = state.pending.filter((p) => !ids.has(p.entry.id));
};

// `lastError` is assigned, undefined included: keeping an older reason when
// this attempt's could not be read would attribute the wrong cause.
const flushFailed: CaseReducer<
  PendingWritesState,
  PayloadAction<{
    gameId: string;
    ids: string[];
    retryable: boolean;
    lastError?: WriteError;
  }>
> = (state, action) => {
  const { ids, retryable, lastError } = action.payload;
  const idSet = new Set(ids);
  for (const item of state.pending) {
    if (!idSet.has(item.entry.id)) continue;
    item.attempts += 1;
    const delay = retryable ? nextAttemptDelayMs(item.attempts) : null;
    item.nextAttemptAt = delay === null ? null : Date.now() + delay;
    item.lastError = lastError;
    item.firstFailedAt ??= Date.now();
  }
};

// Manual retry: only items that exhausted their backoff are eligible, and
// only `nextAttemptAt` resets to fire immediately -- `attempts` is left
// untouched, so a subsequent failure exhausts the backoff table again
// immediately rather than restarting the schedule. Scoped to the requesting
// game -- the flush and the background scheduler both filter by game, so
// resetting another game's items here would move them to "scheduled" with
// nothing left to ever attempt them.
const retryRequested: CaseReducer<
  PendingWritesState,
  PayloadAction<{ gameId: string }>
> = (state, action) => {
  for (const item of state.pending) {
    if (item.gameId !== action.payload.gameId) continue;
    if (item.nextAttemptAt === null) {
      item.nextAttemptAt = Date.now();
    }
  }
};

/**
 * Puts back what a previous run left on disk. Merges rather than replaces and
 * the in-memory copy wins, because the read is asynchronous and a rally can be
 * recorded while it is still in flight. The schedule is recomputed: see D2.
 */
const rehydrated: CaseReducer<
  PendingWritesState,
  PayloadAction<{ items: PersistedPendingEntry[] }>
> = (state, action) => {
  const known = new Set(state.pending.map((p) => p.entry.id));
  const restored = action.payload.items
    .filter((item) => !known.has(item.entry.id))
    .map((item) => ({
      ...item,
      attempts: 0,
      nextAttemptAt: mayBeAttemptedAgain(item.lastError) ? Date.now() : null,
    }));
  // Restored entries were recorded before anything now in memory.
  state.pending = [...restored, ...state.pending];
};

/**
 * The local store has been found unable to hold the queue. One-way: nothing
 * clears it. The boot probe only reports a failure, and a later save failing
 * reports the same thing, so there is no moment at which this component knows
 * the store recovered -- and claiming it did is the exact false reassurance
 * this flag exists to prevent.
 */
const storageUnavailable: CaseReducer<PendingWritesState> = (state) => {
  state.storageUnavailable = true;
};

const pendingWritesSlice = createSlice({
  name: "pendingWrites",
  initialState,
  reducers: {
    enqueued,
    flushSucceeded,
    flushFailed,
    retryRequested,
    rehydrated,
    storageUnavailable,
  },
});

export const pendingWritesActions = pendingWritesSlice.actions;
export type PendingWritesActions = typeof pendingWritesActions;

export default pendingWritesSlice.reducer;
