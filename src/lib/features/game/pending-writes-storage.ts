import type {
  PendingEntry,
  PersistedPendingEntry,
  PersistedQueue,
} from "@/lib/features/game/types";

// The version lives in the snapshot, not in the key. A versioned key would be
// a second copy of the same number, and worse: a build that bumped it would
// look somewhere else entirely, leaving the old snapshot unread, undiscarded
// and unreachable -- so the version check below could never fire.
export const PENDING_WRITES_KEY = "pending-writes";
export const PENDING_WRITES_VERSION = 1;

const PROBE_VALUE = "1";

/**
 * The queue's storage. Asynchronous throughout, and failures are not swallowed
 * here -- see D1 and D4 for both arguments. `load` returns whatever was in the
 * store, unvalidated: the caller decides what an unrecognisable snapshot means.
 */
export type PendingWritesStorage = {
  load(): Promise<unknown>;
  save(snapshot: PersistedQueue): Promise<void>;
  clear(): Promise<void>;
  // Rejects when this store cannot hold anything. Writing once answers every
  // reason it might not, none of which is distinguishable from outside.
  probe(): Promise<void>;
};

/**
 * What survives a restart. `attempts` and `nextAttemptAt` are recomputed on
 * restore, and "currently on the wire" is false by construction after one.
 */
const toPersisted = (item: PendingEntry): PersistedPendingEntry => ({
  entry: item.entry,
  gameId: item.gameId,
  setIndex: item.setIndex,
  ...(item.lastError ? { lastError: item.lastError } : {}),
  ...(item.firstFailedAt === undefined
    ? {}
    : { firstFailedAt: item.firstFailedAt }),
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
      // The string itself, so the caller can tell "nothing stored" from
      // "something stored that nobody can use" and clear the latter.
      return raw;
    }
  },
  async save(snapshot) {
    localStorage.setItem(PENDING_WRITES_KEY, JSON.stringify(snapshot));
  },
  async clear() {
    localStorage.removeItem(PENDING_WRITES_KEY);
  },

  // Reading back is for a write that neither throws nor sticks, which a bare
  // setItem cannot report. It does not catch a store that keeps the value for
  // this session and drops it afterwards -- nothing synchronous can.
  async probe() {
    const key = `${PENDING_WRITES_KEY}:probe`;
    localStorage.setItem(key, PROBE_VALUE);
    const readBack = localStorage.getItem(key);
    localStorage.removeItem(key);
    if (readBack !== PROBE_VALUE) {
      throw new Error("pending-writes storage did not keep what it was given");
    }
  },
};
