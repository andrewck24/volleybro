import { nextAttemptDelayMs } from "@/lib/features/game/pending-writes";
import type {
  PendingEntry,
  PendingWritesState,
} from "@/lib/features/game/types";
import {
  createSlice,
  type CaseReducer,
  type PayloadAction,
} from "@reduxjs/toolkit";

const initialState: PendingWritesState = {
  pending: [],
  flushing: false,
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

const flushStarted: CaseReducer<PendingWritesState> = (state) => {
  state.flushing = true;
};

const flushSucceeded: CaseReducer<
  PendingWritesState,
  PayloadAction<{ ids: string[] }>
> = (state, action) => {
  const ids = new Set(action.payload.ids);
  state.pending = state.pending.filter((p) => !ids.has(p.entry.id));
  state.flushing = false;
};

const flushFailed: CaseReducer<
  PendingWritesState,
  PayloadAction<{ ids: string[]; retryable: boolean }>
> = (state, action) => {
  const { ids, retryable } = action.payload;
  const idSet = new Set(ids);
  for (const item of state.pending) {
    if (!idSet.has(item.entry.id)) continue;
    item.attempts += 1;
    const delay = retryable ? nextAttemptDelayMs(item.attempts) : null;
    item.nextAttemptAt = delay === null ? null : Date.now() + delay;
  }
  state.flushing = false;
};

// Manual retry: only items that exhausted their backoff are eligible, and
// they resume at attempt count 1 of the background schedule rather than
// picking up wherever the previous run left off.
const retryRequested: CaseReducer<PendingWritesState> = (state) => {
  for (const item of state.pending) {
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
