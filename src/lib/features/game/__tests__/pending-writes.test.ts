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

const stateOf = (
  pending: PendingEntry[],
  storageUnavailable = false,
): PendingWritesState => ({ pending, storageUnavailable });

const retryable = { code: "TRANSIENT", reason: "NETWORK_ERROR", status: 503 };
const notRetryable = { code: "VALIDATION", reason: "BAD_REQUEST", status: 400 };

describe("deriveSyncStatus", () => {
  it("reads synced when the queue is empty", () => {
    expect(deriveSyncStatus(stateOf([]), "game-1")).toBe("synced");
  });

  it("reads syncing while attempts are below the threshold", () => {
    expect(
      deriveSyncStatus(stateOf([makePendingEntry({ attempts: 0 })]), "game-1"),
    ).toBe("syncing");
  });

  // The hiccup case: one failure is survivable, and the 2s background retry
  // usually clears it. Turning the icon over here would flicker on every
  // transient failure.
  it("still reads syncing after a single measured failure", () => {
    const state = stateOf([
      makePendingEntry({ attempts: 1, lastError: retryable as never }),
    ]);
    expect(deriveSyncStatus(state, "game-1")).toBe("syncing");
  });

  it("reads unsent once any entry has failed twice", () => {
    const state = stateOf([
      makePendingEntry({ entry: { id: "e1" } as never, attempts: 0 }),
      makePendingEntry({
        entry: { id: "e2" } as never,
        attempts: 2,
        lastError: retryable as never,
      }),
    ]);
    expect(deriveSyncStatus(state, "game-1")).toBe("unsent");
  });

  it("reads failed when an entry cannot be attempted again", () => {
    const state = stateOf([
      makePendingEntry({ attempts: 1, lastError: notRetryable as never }),
    ]);
    expect(deriveSyncStatus(state, "game-1")).toBe("failed");
  });

  // An entry that will never send outranks a queue that is merely waiting.
  it("prefers failed over unsent when both are true", () => {
    const state = stateOf([
      makePendingEntry({
        entry: { id: "e1" } as never,
        attempts: 3,
        lastError: retryable as never,
      }),
      makePendingEntry({
        entry: { id: "e2" } as never,
        attempts: 1,
        lastError: notRetryable as never,
      }),
    ]);
    expect(deriveSyncStatus(state, "game-1")).toBe("failed");
  });

  // "Hidden" means no risk, not no queue: nothing recorded from here would
  // survive the app being reclaimed, so an empty queue is not reassuring.
  it("reads unwritable even when the queue is empty", () => {
    expect(deriveSyncStatus(stateOf([], true), "game-1")).toBe("unwritable");
  });

  it("prefers unwritable over failed, because everything unsent is at stake", () => {
    const state = stateOf(
      [makePendingEntry({ attempts: 1, lastError: notRetryable as never })],
      true,
    );
    expect(deriveSyncStatus(state, "game-1")).toBe("unwritable");
  });

  it("ignores another game's queue", () => {
    const state = stateOf([
      makePendingEntry({ gameId: "game-2", attempts: 5 }),
    ]);
    expect(deriveSyncStatus(state, "game-1")).toBe("synced");
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
      storageUnavailable: false,
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
      storageUnavailable: false,
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
