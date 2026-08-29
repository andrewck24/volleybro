import { hasExpired } from "@/lib/features/game/pending-writes";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import {
  PENDING_WRITES_VERSION,
  snapshotOf,
  type PendingWritesStorage,
} from "@/lib/features/game/pending-writes-storage";
import {
  PersistedQueueSchema,
  type PendingWritesState,
} from "@/lib/features/game/types";
import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";

const { enqueued, flushSucceeded, flushFailed, rehydrated } =
  pendingWritesActions;

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
    // `rehydrated` is here so a restore that dropped an expired entry writes
    // the shorter queue back, rather than re-reading and re-dropping it on
    // every start until something else happens to trigger a save.
    matcher: isAnyOf(enqueued, flushSucceeded, flushFailed, rehydrated),
    effect: (_action, api) => {
      persist(api.getState().pendingWrites.pending);
    },
  });

  return listener.middleware;
}

/**
 * Puts a previous run's queue back, once, when the store's provider mounts.
 *
 * A snapshot from a shape this build does not understand is discarded whole
 * rather than migrated: the queue holds minutes of unsent work in the normal
 * case, and a migration bug would corrupt precisely what it exists to
 * protect. Nothing is sent here -- the entries go back into the queue and
 * wait for the recorder to open that game, which is also what keeps this
 * free of any session check.
 */
export async function restorePendingWrites(
  dispatch: (
    action: ReturnType<typeof pendingWritesActions.rehydrated>,
  ) => void,
  storage: PendingWritesStorage,
): Promise<void> {
  const raw = await storage.load().catch((error: unknown) => {
    console.warn("[pendingWrites] restore failed:", error);
    return null;
  });
  const parsed = PersistedQueueSchema.safeParse(raw);
  if (!parsed.success || parsed.data.version !== PENDING_WRITES_VERSION) return;

  const snapshot = parsed.data;
  if (snapshot.items.length === 0) return;

  // Expiry is applied here, on the read, rather than on a timer: it costs
  // nothing while the app runs, and a queue is only ever read once.
  const now = Date.now();
  const items = snapshot.items.filter((item) => !hasExpired(item, now));
  if (items.length === 0) {
    // Nothing survived, so nothing is dispatched and the listener that
    // normally writes the shorter queue back never runs. Without this the
    // dead snapshot would be re-read and re-dropped on every start.
    await storage.clear().catch((error: unknown) => {
      console.warn("[pendingWrites] clear failed:", error);
    });
    return;
  }
  dispatch(pendingWritesActions.rehydrated({ items }));
}
