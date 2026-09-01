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

// Only the state this listener reads: it keeps the middleware out of a cycle
// with the store that mounts it.
type StateWithPendingWrites = { pendingWrites: PendingWritesState };

/**
 * Mirrors the queue to storage on every change to its contents. No debounce:
 * recording a rally and having it on disk must not be separated by a window in
 * which the app can die.
 */
export function createPendingWritesPersistence(storage: PendingWritesStorage) {
  const listener = createListenerMiddleware<StateWithPendingWrites>();

  // Immediate when nothing is in flight, so a synchronous store completes
  // before this returns. Saves behind an open one collapse to the newest.
  let inFlight: Promise<void> | null = null;
  let queued: PendingWritesState["pending"] | null = null;

  const run = (pending: PendingWritesState["pending"]): Promise<void> =>
    storage
      .save(snapshotOf(pending))
      // ponytail: silent degradation -- an unwritable store leaves the queue
      // unprotected and the recorder untold. Offline recording puts this in
      // the state; until then, this catch also stops one failure from
      // stalling every save behind it.
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
    // `rehydrated` too: a restore that dropped an expired entry has to write
    // the shorter queue back.
    matcher: isAnyOf(enqueued, flushSucceeded, flushFailed, rehydrated),
    effect: (_action, api) => {
      persist(api.getState().pendingWrites.pending);
    },
  });

  return listener.middleware;
}

// Nothing is dispatched on these paths, so the listener that writes the queue
// back never runs and the dead snapshot would be re-read on every start.
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
    await discard(storage);
    return;
  }
  dispatch(pendingWritesActions.rehydrated({ items }));
}
