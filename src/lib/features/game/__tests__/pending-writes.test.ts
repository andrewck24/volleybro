import {
  deriveSyncStatus,
  hasFailedWrite,
  nextAttemptDelayMs,
  PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS,
} from "@/lib/features/game/pending-writes";
import type {
  PendingEntry,
  PendingWritesState,
} from "@/lib/features/game/types";

const makePendingEntry = (
  overrides: Partial<PendingEntry> = {},
): PendingEntry => ({
  entry: { id: "e1", seq: 0, win: true, home: {}, away: {} } as never,
  gameId: "game-1",
  setIndex: 0,
  attempts: 0,
  nextAttemptAt: Date.now(),
  ...overrides,
});

describe("deriveSyncStatus", () => {
  it("reads synced when the queue is empty", () => {
    const state: PendingWritesState = { pending: [], flushing: false };
    expect(deriveSyncStatus(state)).toBe("synced");
  });

  it("reads syncing when a flush is in flight", () => {
    const state: PendingWritesState = {
      pending: [makePendingEntry({ nextAttemptAt: null })],
      flushing: true,
    };
    expect(deriveSyncStatus(state)).toBe("syncing");
  });

  it("reads syncing when any item still has a scheduled attempt", () => {
    const state: PendingWritesState = {
      pending: [
        makePendingEntry({ nextAttemptAt: null }),
        makePendingEntry({ nextAttemptAt: Date.now() + 2000 }),
      ],
      flushing: false,
    };
    expect(deriveSyncStatus(state)).toBe("syncing");
  });

  it("reads unsynced when every item has exhausted its backoff", () => {
    const state: PendingWritesState = {
      pending: [
        makePendingEntry({ nextAttemptAt: null }),
        makePendingEntry({ nextAttemptAt: null }),
      ],
      flushing: false,
    };
    expect(deriveSyncStatus(state)).toBe("unsynced");
  });
});

describe("hasFailedWrite", () => {
  it("is true only for an entry whose backoff is exhausted", () => {
    const state: PendingWritesState = {
      pending: [
        makePendingEntry({
          entry: { id: "e1" } as never,
          nextAttemptAt: null,
        }),
        makePendingEntry({
          entry: { id: "e2" } as never,
          nextAttemptAt: Date.now() + 2000,
        }),
      ],
      flushing: false,
    };
    expect(hasFailedWrite(state, "e1")).toBe(true);
    expect(hasFailedWrite(state, "e2")).toBe(false);
  });

  it("is false for an entry not in the queue at all", () => {
    const state: PendingWritesState = { pending: [], flushing: false };
    expect(hasFailedWrite(state, "e1")).toBe(false);
  });
});

describe("nextAttemptDelayMs", () => {
  it("walks the background backoff table by attempt count", () => {
    PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS.forEach((delay, index) => {
      expect(nextAttemptDelayMs(index + 1)).toBe(delay);
    });
  });

  it("is exhausted once attempts run past the table", () => {
    expect(
      nextAttemptDelayMs(PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS.length + 1),
    ).toBeNull();
  });
});
