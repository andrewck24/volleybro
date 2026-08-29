import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import {
  snapshotOf,
  type PendingWritesStorage,
} from "@/lib/features/game/pending-writes-storage";
import type { PendingWritesState } from "@/lib/features/game/types";
import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";

const { enqueued, flushSucceeded, flushFailed } = pendingWritesActions;

// Only the state this listener reads, rather than the whole store: it keeps
// the middleware out of a cycle with the store that mounts it, and says
// plainly that nothing else here is its business.
type StateWithPendingWrites = { pendingWrites: PendingWritesState };

/**
 * Mirrors the queue to storage on every change to its contents.
 *
 * The listener runs after the reducer, so `getState()` already holds the
 * merged queue -- the merge is the reducer's `push` and `filter`, and nothing
 * here repeats it. The snapshot is the whole queue every time: at tens of
 * entries the cost is invisible, and an incremental format would have to keep
 * its own consistency for no benefit at this size.
 *
 * There is no debounce. Recording a rally and having it on disk must not be
 * separated by a window in which the app can die, which is the entire failure
 * this exists to prevent.
 */
export function createPendingWritesPersistence(storage: PendingWritesStorage) {
  const listener = createListenerMiddleware<StateWithPendingWrites>();

  // A save runs immediately when nothing is in flight -- which, for a
  // synchronous store, means the write completes before this function
  // returns. While one is in flight, only the newest snapshot is kept: each
  // is complete, so an intermediate one is not worth writing, and the newest
  // is the one that must end up on disk.
  let inFlight: Promise<void> | null = null;
  let queued: PendingWritesState["pending"] | null = null;

  const run = (pending: PendingWritesState["pending"]): Promise<void> =>
    storage
      .save(snapshotOf(pending))
      // ponytail: silent degradation. An unwritable store -- private
      // browsing, exhausted quota, site data disabled -- means the queue is
      // not protected and the recorder is never told. Offline recording needs
      // this in the state so the indicator can say so; until then this catch
      // is also what keeps a failure from stalling every later save.
      .catch((error: unknown) => {
        console.warn("[pendingWrites] persist failed:", error);
      })
      .then(() => {
        const next = queued;
        queued = null;
        inFlight = next === null ? null : run(next);
      });

  const persist = (pending: PendingWritesState["pending"]) => {
    if (inFlight) {
      queued = pending;
      return;
    }
    inFlight = run(pending);
  };

  listener.startListening({
    matcher: isAnyOf(enqueued, flushSucceeded, flushFailed),
    effect: (_action, api) => {
      persist(api.getState().pendingWrites.pending);
    },
  });

  return listener.middleware;
}
