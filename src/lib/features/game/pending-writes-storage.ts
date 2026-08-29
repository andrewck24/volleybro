import type {
  PendingEntry,
  PersistedPendingEntry,
  PersistedQueue,
} from "@/lib/features/game/types";

export const PENDING_WRITES_KEY = "pending-writes:v1";
export const PENDING_WRITES_VERSION = 1;

/**
 * The queue's storage. Asynchronous throughout, and failures are not swallowed
 * here -- see D1 and D4 for both arguments. `load` returns whatever was in the
 * store, unvalidated: the caller decides what an unrecognisable snapshot means.
 */
export type PendingWritesStorage = {
  load(): Promise<unknown>;
  save(snapshot: PersistedQueue): Promise<void>;
  clear(): Promise<void>;
};

/**
 * What survives a restart. `attempts` and `nextAttemptAt` are recomputed on
 * restore, and "currently on the wire" is false by construction after one.
 */
export const toPersisted = (item: PendingEntry): PersistedPendingEntry => ({
  entry: item.entry,
  gameId: item.gameId,
  setIndex: item.setIndex,
  ...(item.lastError ? { lastError: item.lastError } : {}),
  ...(item.failedAt === undefined ? {} : { failedAt: item.failedAt }),
});

export const snapshotOf = (pending: PendingEntry[]): PersistedQueue => ({
  version: PENDING_WRITES_VERSION,
  items: pending.map(toPersisted),
});

/**
 * The synchronous `setItem` runs inside the asynchronous body, so returning
 * from `save` means the bytes are already on disk -- an app reclaimed
 * mid-recording cannot lose a write that has already returned.
 */
export const localStoragePendingWrites: PendingWritesStorage = {
  async load() {
    const raw = localStorage.getItem(PENDING_WRITES_KEY);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      // Nothing is recoverable from a half-written string, and failing here
      // would take down the app over a queue that is usually empty.
      return null;
    }
  },
  async save(snapshot) {
    localStorage.setItem(PENDING_WRITES_KEY, JSON.stringify(snapshot));
  },
  async clear() {
    localStorage.removeItem(PENDING_WRITES_KEY);
  },
};
