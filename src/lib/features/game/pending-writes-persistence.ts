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
import { z } from "zod";

const { enqueued, flushSucceeded, flushFailed, rehydrated } =
  pendingWritesActions;

// Only the state this listener reads, rather than the whole store: it keeps
// the middleware out of a cycle with the store that mounts it, and says
// plainly that nothing else here is its business.
type StateWithPendingWrites = { pendingWrites: PendingWritesState };

/**
 * Mirrors the queue to storage on every change to its contents. The listener
 * runs after the reducer, so the state it reads is already merged and nothing
 * here repeats that. No debounce: recording a rally and having it on disk must
 * not be separated by a window in which the app can die.
 */
export function createPendingWritesPersistence(storage: PendingWritesStorage) {
  const listener = createListenerMiddleware<StateWithPendingWrites>();

  // A save runs immediately when nothing is in flight, so a synchronous store
  // completes before this returns. Saves behind an open one collapse to the
  // newest: each snapshot is whole, so only the last needs to survive.
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

// Nothing here is dispatched, so the listener that writes the queue back
// never runs; without this the dead snapshot is re-read on every start.
const discard = (storage: PendingWritesStorage) =>
  storage.clear().catch((error: unknown) => {
    console.warn("[pendingWrites] clear failed:", error);
  });

/**
 * Puts a previous run's queue back, once, when the store's provider mounts.
 * Nothing is sent here -- the entries wait for the recorder to open that game,
 * which is also why this needs no session check. See D2 and D3.
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
  if (raw === null || raw === undefined) return;

  // Version before shape: the schema describes what this build writes, so
  // parsing first would reject a future snapshot as malformed and never reach
  // the version check at all.
  const envelope = z.object({ version: z.number() }).safeParse(raw);
  if (!envelope.success) {
    // Something is stored that is not a snapshot at all.
    await discard(storage);
    return;
  }
  if (envelope.data.version !== PENDING_WRITES_VERSION) {
    // Only a version this build has already moved past is deleted. A newer one
    // may belong to a build the user is also running, and this is the one
    // place where guessing wrong destroys unsent work.
    if (envelope.data.version < PENDING_WRITES_VERSION) await discard(storage);
    return;
  }

  const parsed = PersistedQueueSchema.safeParse(raw);
  if (!parsed.success) {
    // Our own version, a shape we cannot read: corrupt, and no later build
    // will read it either.
    await discard(storage);
    return;
  }

  const snapshot = parsed.data;
  if (snapshot.items.length === 0) return;

  // Expiry is applied here, on the read, rather than on a timer: it costs
  // nothing while the app runs, and a queue is only ever read once.
  const now = Date.now();
  const items = snapshot.items.filter((item) => !hasExpired(item, now));
  if (items.length === 0) {
    // Nothing survived, so nothing is dispatched and the listener that
    // normally writes the shorter queue back never runs.
    await discard(storage);
    return;
  }
  dispatch(pendingWritesActions.rehydrated({ items }));
}
