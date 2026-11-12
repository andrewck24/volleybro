import type {
  PendingEntry,
  PersistedPendingEntry,
  PersistedQueue,
} from "@/lib/features/game/types";

export const PENDING_WRITES_KEY = "pending-writes";
export const PENDING_WRITES_VERSION = 2;

const PROBE_VALUE = "1";

export type PendingWritesStorage = {
  load(): Promise<unknown>;
  save(snapshot: PersistedQueue): Promise<void>;
  clear(): Promise<void>;
  probe(): Promise<void>;
};

const toPersisted = (item: PendingEntry): PersistedPendingEntry => ({
  entry: item.entry,
  gameId: item.gameId,
  setIndex: item.setIndex,
  ...(item.userId === undefined ? {} : { userId: item.userId }),
  ...(item.lastError ? { lastError: item.lastError } : {}),
  ...(item.firstFailedAt === undefined
    ? {}
    : { firstFailedAt: item.firstFailedAt }),
});

export const snapshotOf = (pending: PendingEntry[]): PersistedQueue => ({
  version: PENDING_WRITES_VERSION,
  items: pending.map(toPersisted),
});

const RECORDER_KEY = "pending-writes-recorder";

export const rememberRecorder = (userId: string): void => {
  try {
    localStorage.setItem(RECORDER_KEY, userId);
  } catch {}
};

export const forgetRecorder = (): void => {
  try {
    localStorage.removeItem(RECORDER_KEY);
  } catch {}
};

export const recalledRecorder = (): string | undefined => {
  try {
    return localStorage.getItem(RECORDER_KEY) ?? undefined;
  } catch {
    return undefined;
  }
};

export const localStoragePendingWrites: PendingWritesStorage = {
  async load() {
    const raw = localStorage.getItem(PENDING_WRITES_KEY);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  },
  async save(snapshot) {
    localStorage.setItem(PENDING_WRITES_KEY, JSON.stringify(snapshot));
  },
  async clear() {
    localStorage.removeItem(PENDING_WRITES_KEY);
  },

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
