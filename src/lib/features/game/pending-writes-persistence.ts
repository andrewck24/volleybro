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

type StateWithPendingWrites = { pendingWrites: PendingWritesState };

type StorageDispatch = (
  action: ReturnType<typeof pendingWritesActions.storageUnavailable>,
) => void;

export function createPendingWritesPersistence(storage: PendingWritesStorage) {
  const listener = createListenerMiddleware<StateWithPendingWrites>();

  let inFlight: Promise<void> | null = null;
  let queued: PendingWritesState["pending"] | null = null;

  const run = (
    pending: PendingWritesState["pending"],
    dispatch: StorageDispatch,
  ): Promise<void> =>
    storage
      .save(snapshotOf(pending))
      .catch((error: unknown) => {
        console.warn("[pendingWrites] persist failed:", error);
        dispatch(pendingWritesActions.storageUnavailable());
      })
      .then(() => {
        const next = queued;
        queued = null;
        inFlight = next === null ? null : run(next, dispatch);
      });

  const persist = (
    pending: PendingWritesState["pending"],
    dispatch: StorageDispatch,
  ) => {
    if (inFlight) {
      queued = pending;
      return;
    }
    inFlight = run(pending, dispatch);
  };

  listener.startListening({
    matcher: isAnyOf(enqueued, flushSucceeded, flushFailed, rehydrated),
    effect: (_action, api) => {
      persist(api.getState().pendingWrites.pending, api.dispatch);
    },
  });

  return listener.middleware;
}

const discard = (storage: PendingWritesStorage) =>
  storage.clear().catch((error: unknown) => {
    console.warn("[pendingWrites] clear failed:", error);
  });

export async function probePendingWritesStorage(
  dispatch: StorageDispatch,
  storage: PendingWritesStorage,
): Promise<void> {
  await storage.probe().catch((error: unknown) => {
    console.warn("[pendingWrites] storage probe failed:", error);
    dispatch(pendingWritesActions.storageUnavailable());
  });
}

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

  const envelope = z.object({ version: z.number() }).safeParse(raw);
  if (!envelope.success) {
    await discard(storage);
    return;
  }
  if (envelope.data.version !== PENDING_WRITES_VERSION) {
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

  const now = Date.now();
  const items = snapshot.items.filter((item) => !hasExpired(item, now));
  if (items.length === 0) {
    await discard(storage);
    return;
  }
  dispatch(pendingWritesActions.rehydrated({ items }));
}
