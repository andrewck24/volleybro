import {
  PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS,
  deriveSyncStatus,
} from "@/lib/features/game/pending-writes";
import pendingWritesReducer, {
  pendingWritesActions,
} from "@/lib/features/game/pending-writes-slice";
import type {
  PendingEntry,
  PendingWritesState,
} from "@/lib/features/game/types";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

const entry = (id: string) =>
  ({ id, seq: 0, win: true, home: {}, away: {} }) as PendingEntry["entry"];

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(1_000_000);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("pendingWrites reducer", () => {
  it("enqueues a fresh entry at attempt 0, due immediately", () => {
    const state = pendingWritesReducer(
      undefined,
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );

    expect(state.pending).toEqual([
      {
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 0,
        attempts: 0,
        nextAttemptAt: Date.now(),
      },
    ]);
    expect(deriveSyncStatus(state)).toBe("syncing");
  });

  it("flushStarted flips flushing on", () => {
    const state = pendingWritesReducer(
      undefined,
      pendingWritesActions.flushStarted(),
    );
    expect(state.flushing).toBe(true);
  });

  it("flushSucceeded removes only the confirmed ids and clears flushing", () => {
    const seeded: PendingWritesState = {
      flushing: true,
      pending: [
        {
          entry: entry("e1"),
          gameId: "game-1",
          setIndex: 0,
          attempts: 0,
          nextAttemptAt: Date.now(),
        },
        {
          entry: entry("e2"),
          gameId: "game-1",
          setIndex: 0,
          attempts: 0,
          nextAttemptAt: Date.now(),
        },
      ],
    };

    const state = pendingWritesReducer(
      seeded,
      pendingWritesActions.flushSucceeded({ ids: ["e1"] }),
    );

    expect(state.pending.map((p) => p.entry.id)).toEqual(["e2"]);
    expect(state.flushing).toBe(false);
  });

  it("flushFailed schedules the next background delay by attempt count", () => {
    const seeded: PendingWritesState = {
      flushing: true,
      pending: [
        {
          entry: entry("e1"),
          gameId: "game-1",
          setIndex: 0,
          attempts: 0,
          nextAttemptAt: Date.now(),
        },
      ],
    };

    let state = pendingWritesReducer(
      seeded,
      pendingWritesActions.flushFailed({ ids: ["e1"], retryable: true }),
    );

    expect(state.pending[0]!.attempts).toBe(1);
    expect(state.pending[0]!.nextAttemptAt).toBe(
      Date.now() + PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS[0]!,
    );
    expect(state.flushing).toBe(false);

    for (let i = 1; i < PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS.length; i++) {
      state = pendingWritesReducer(
        state,
        pendingWritesActions.flushFailed({ ids: ["e1"], retryable: true }),
      );
      expect(state.pending[0]!.nextAttemptAt).toBe(
        Date.now() + PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS[i]!,
      );
    }

    // Budget exhausted: one more failure marks it unrecoverable.
    state = pendingWritesReducer(
      state,
      pendingWritesActions.flushFailed({ ids: ["e1"], retryable: true }),
    );
    expect(state.pending[0]!.nextAttemptAt).toBeNull();
    expect(deriveSyncStatus(state)).toBe("unsynced");
  });

  it("flushFailed marks a non-retryable error as failed immediately, no backoff", () => {
    const seeded: PendingWritesState = {
      flushing: true,
      pending: [
        {
          entry: entry("e1"),
          gameId: "game-1",
          setIndex: 0,
          attempts: 0,
          nextAttemptAt: Date.now(),
        },
      ],
    };

    const state = pendingWritesReducer(
      seeded,
      pendingWritesActions.flushFailed({ ids: ["e1"], retryable: false }),
    );

    expect(state.pending[0]!.attempts).toBe(1);
    expect(state.pending[0]!.nextAttemptAt).toBeNull();
  });

  it("retryRequested only resets items whose backoff is exhausted", () => {
    const seeded: PendingWritesState = {
      flushing: false,
      pending: [
        {
          entry: entry("e1"),
          gameId: "game-1",
          setIndex: 0,
          attempts: 3,
          nextAttemptAt: null,
        },
        {
          entry: entry("e2"),
          gameId: "game-1",
          setIndex: 0,
          attempts: 1,
          nextAttemptAt: Date.now() + 5000,
        },
      ],
    };

    const state = pendingWritesReducer(
      seeded,
      pendingWritesActions.retryRequested(),
    );

    expect(state.pending[0]!.nextAttemptAt).toBe(Date.now());
    expect(state.pending[1]!.nextAttemptAt).toBe(
      seeded.pending[1]!.nextAttemptAt,
    );
  });
});
