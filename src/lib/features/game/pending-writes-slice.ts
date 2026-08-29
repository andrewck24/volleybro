import { nextAttemptDelayMs } from "@/lib/features/game/pending-writes";
import type {
  PendingEntry,
  PendingWritesState,
  WriteError,
} from "@/lib/features/game/types";
import {
  createSlice,
  type CaseReducer,
  type PayloadAction,
} from "@reduxjs/toolkit";

const initialState: PendingWritesState = {
  pending: [],
  flushingGameIds: [],
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

const flushStarted: CaseReducer<
  PendingWritesState,
  PayloadAction<{ gameId: string }>
> = (state, action) => {
  if (!state.flushingGameIds.includes(action.payload.gameId)) {
    state.flushingGameIds.push(action.payload.gameId);
  }
};

const flushSucceeded: CaseReducer<
  PendingWritesState,
  PayloadAction<{ gameId: string; ids: string[] }>
> = (state, action) => {
  const ids = new Set(action.payload.ids);
  state.pending = state.pending.filter((p) => !ids.has(p.entry.id));
  state.flushingGameIds = state.flushingGameIds.filter(
    (id) => id !== action.payload.gameId,
  );
};

// `lastError` is assigned rather than merged, undefined included: it is the
// reason the *latest* attempt failed, so keeping an older one when this
// attempt's reason could not be read would attribute the wrong cause. A
// success removes the item outright, so no stale error can survive one.
const flushFailed: CaseReducer<
  PendingWritesState,
  PayloadAction<{
    gameId: string;
    ids: string[];
    retryable: boolean;
    lastError?: WriteError;
  }>
> = (state, action) => {
  const { gameId, ids, retryable, lastError } = action.payload;
  const idSet = new Set(ids);
  for (const item of state.pending) {
    if (!idSet.has(item.entry.id)) continue;
    item.attempts += 1;
    const delay = retryable ? nextAttemptDelayMs(item.attempts) : null;
    item.nextAttemptAt = delay === null ? null : Date.now() + delay;
    item.lastError = lastError;
  }
  state.flushingGameIds = state.flushingGameIds.filter((id) => id !== gameId);
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

const pendingWritesSlice = createSlice({
  name: "pendingWrites",
  initialState,
  reducers: {
    enqueued,
    flushStarted,
    flushSucceeded,
    flushFailed,
    retryRequested,
  },
});

export const pendingWritesActions = pendingWritesSlice.actions;
export type PendingWritesActions = typeof pendingWritesActions;

export default pendingWritesSlice.reducer;
