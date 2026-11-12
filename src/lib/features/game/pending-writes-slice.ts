import {
  isQueuedBy,
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
  PayloadAction<Pick<PendingEntry, "entry" | "gameId" | "setIndex" | "userId">>
> = (state, action) => {
  const { entry, gameId } = action.payload;
  state.pending = state.pending.filter(
    (p) =>
      p.gameId !== gameId ||
      p.entry.id !== entry.id ||
      mayBeAttemptedAgain(p.lastError),
  );
  state.pending.push({
    ...action.payload,
    attempts: 0,
    nextAttemptAt: Date.now(),
  });
};

const flushSucceeded: CaseReducer<
  PendingWritesState,
  PayloadAction<{ ids: string[] }>
> = (state, action) => {
  const ids = new Set(action.payload.ids);
  state.pending = state.pending.filter((p) => !ids.has(p.entry.id));
};

const flushFailed: CaseReducer<
  PendingWritesState,
  PayloadAction<{
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

const retryRequested: CaseReducer<
  PendingWritesState,
  PayloadAction<{ gameId: string; userId?: string }>
> = (state, action) => {
  const { gameId, userId } = action.payload;
  for (const item of state.pending) {
    if (item.gameId !== gameId || !isQueuedBy(item, userId)) continue;
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
  state.pending = [...restored, ...state.pending];
};

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
