import type {
  PendingEntry,
  PersistedPendingEntry,
  PersistedQueue,
} from "@/lib/features/game/types";

export const PENDING_WRITES_KEY = "pending-writes:v1";
export const PENDING_WRITES_VERSION = 1;

/**
 * The queue's storage, reached through nothing larger than this. Every method
 * is asynchronous because the stores a native target would use -- AsyncStorage,
 * SQLite, Capacitor Preferences -- have no synchronous form, and a synchronous
 * signature chosen here would have to be unpicked at every call site later.
 * Wrapping a synchronous store costs nothing in the other direction.
 *
 * Failures are not swallowed here. Whether an unwritable store is tolerable is
 * a policy, and it lives with the caller (see pending-writes-persistence).
 */
export type PendingWritesStorage = {
  load(): Promise<PersistedQueue | null>;
  save(snapshot: PersistedQueue): Promise<void>;
  clear(): Promise<void>;
};

/**
 * What survives a restart: the entry, where it belongs, and why it last
 * failed. `attempts` and `nextAttemptAt` are left out because they are
 * recomputed on restore -- a stored absolute timestamp is always in the past
 * by then anyway -- and `flushingGameIds` because "currently on the wire" is
 * false by construction after a restart.
 */
export const toPersisted = (item: PendingEntry): PersistedPendingEntry => ({
  entry: item.entry,
  gameId: item.gameId,
  setIndex: item.setIndex,
  ...(item.lastError ? { lastError: item.lastError } : {}),
});

export const snapshotOf = (pending: PendingEntry[]): PersistedQueue => ({
  version: PENDING_WRITES_VERSION,
  items: pending.map(toPersisted),
});

/**
 * The synchronous `setItem` runs inside the asynchronous body, so returning
 * from `save` means the bytes are already on disk. That is the property this
 * whole Change rests on: an app the operating system reclaims mid-recording
 * cannot lose a write that has already returned.
 */
export const localStoragePendingWrites: PendingWritesStorage = {
  async load() {
    const raw = localStorage.getItem(PENDING_WRITES_KEY);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as PersistedQueue;
    } catch {
      // Unreadable stored data is treated as no stored data. There is nothing
      // to recover from a half-written string, and failing here would take
      // down the app over a queue that is usually empty.
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
