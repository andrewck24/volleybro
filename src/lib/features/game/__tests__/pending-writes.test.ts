import {
  deriveSyncStatus,
  hasFailedWrite,
  isPendingWrite,
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
    const state: PendingWritesState = { pending: [], flushingGameIds: [] };
    expect(deriveSyncStatus(state, "game-1")).toBe("synced");
  });

  it("reads syncing when a flush for this game is in flight", () => {
    const state: PendingWritesState = {
      pending: [makePendingEntry({ nextAttemptAt: null })],
      flushingGameIds: ["game-1"],
    };
    expect(deriveSyncStatus(state, "game-1")).toBe("syncing");
  });

  it("reads syncing when any item still has a scheduled attempt", () => {
    const state: PendingWritesState = {
      pending: [
        makePendingEntry({ nextAttemptAt: null }),
        makePendingEntry({ nextAttemptAt: Date.now() + 2000 }),
      ],
      flushingGameIds: [],
    };
    expect(deriveSyncStatus(state, "game-1")).toBe("syncing");
  });

  it("reads unsynced when every item has exhausted its backoff", () => {
    const state: PendingWritesState = {
      pending: [
        makePendingEntry({ nextAttemptAt: null }),
        makePendingEntry({ nextAttemptAt: null }),
      ],
      flushingGameIds: [],
    };
    expect(deriveSyncStatus(state, "game-1")).toBe("unsynced");
  });

  // The two behaviours the flag needed identity to distinguish: with a bare
  // boolean, "this game's queue exhausted, another game's flush in flight"
  // and "this game's queue exhausted, this game's own flush in flight" were
  // indistinguishable and one of them always misreported.
  it("reads unsynced -- not syncing -- when this game's queue is exhausted and a different game's flush is in flight", () => {
    const state: PendingWritesState = {
      pending: [makePendingEntry({ gameId: "game-1", nextAttemptAt: null })],
      flushingGameIds: ["game-2"],
    };
    expect(deriveSyncStatus(state, "game-1")).toBe("unsynced");
  });

  it("reads syncing when this game's queue is exhausted but this game's own flush is in flight", () => {
    const state: PendingWritesState = {
      pending: [makePendingEntry({ gameId: "game-1", nextAttemptAt: null })],
      flushingGameIds: ["game-1"],
    };
    expect(deriveSyncStatus(state, "game-1")).toBe("syncing");
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
      flushingGameIds: [],
    };
    expect(hasFailedWrite(state, "e1")).toBe(true);
    expect(hasFailedWrite(state, "e2")).toBe(false);
  });
});

describe("isPendingWrite", () => {
  it("is true only for an entry with a scheduled attempt", () => {
    const state: PendingWritesState = {
      pending: [
        makePendingEntry({
          entry: { id: "e1" } as never,
          nextAttemptAt: Date.now() + 2000,
        }),
        makePendingEntry({
          entry: { id: "e2" } as never,
          nextAttemptAt: null,
        }),
      ],
      flushingGameIds: [],
    };
    expect(isPendingWrite(state, "e1")).toBe(true);
    expect(isPendingWrite(state, "e2")).toBe(false);
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
