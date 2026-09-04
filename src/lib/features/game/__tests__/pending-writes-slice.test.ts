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
    expect(deriveSyncStatus(state, "game-1")).toBe("syncing");
  });

  it("flushSucceeded removes only the confirmed ids", () => {
    const seeded: PendingWritesState = {
      storageUnavailable: false,
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
  });

  it("flushFailed schedules the next background delay by attempt count", () => {
    const seeded: PendingWritesState = {
      storageUnavailable: false,
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
      pendingWritesActions.flushFailed({
        ids: ["e1"],
        retryable: true,
      }),
    );

    expect(state.pending[0]!.attempts).toBe(1);
    expect(state.pending[0]!.nextAttemptAt).toBe(
      Date.now() + PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS[0]!,
    );

    for (let i = 1; i < PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS.length; i++) {
      state = pendingWritesReducer(
        state,
        pendingWritesActions.flushFailed({
          ids: ["e1"],
          retryable: true,
        }),
      );
      expect(state.pending[0]!.nextAttemptAt).toBe(
        Date.now() + PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS[i]!,
      );
    }

    // Budget exhausted: one more failure marks it unrecoverable.
    state = pendingWritesReducer(
      state,
      pendingWritesActions.flushFailed({
        ids: ["e1"],
        retryable: true,
      }),
    );
    expect(state.pending[0]!.nextAttemptAt).toBeNull();
    // Retryable, so it is still worth sending -- it just has no schedule of
    // its own left. That reads as waiting, not as lost.
    expect(deriveSyncStatus(state, "game-1")).toBe("unsent");
  });

  it("records why the last attempt failed, and keeps no reason before one has", () => {
    const enqueued = pendingWritesReducer(
      undefined,
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    // An entry that has never failed carries no reason at all, rather than a
    // placeholder standing in for one.
    expect(enqueued.pending[0]!.lastError).toBeUndefined();

    const failed = pendingWritesReducer(
      enqueued,
      pendingWritesActions.flushFailed({
        ids: ["e1"],
        retryable: false,
        lastError: {
          code: "AUTHENTICATION",
          reason: "SESSION_REQUIRED",
          status: 401,
        },
      }),
    );
    expect(failed.pending[0]!.lastError).toEqual({
      code: "AUTHENTICATION",
      reason: "SESSION_REQUIRED",
      status: 401,
    });

    // The reason is the latest attempt's, not an accumulation: a later
    // failure whose cause could not be read must not leave the older one
    // standing as if it still applied.
    const failedAgain = pendingWritesReducer(
      failed,
      pendingWritesActions.flushFailed({
        ids: ["e1"],
        retryable: true,
      }),
    );
    expect(failedAgain.pending[0]!.lastError).toBeUndefined();
  });

  it("dates an entry from its first failure, not its latest attempt", () => {
    let state = pendingWritesReducer(
      undefined,
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    state = pendingWritesReducer(
      state,
      pendingWritesActions.flushFailed({
        ids: ["e1"],
        retryable: false,
      }),
    );
    const first = state.pending[0]!.firstFailedAt;
    expect(first).toBe(Date.now());

    // A flush sends every pending entry for its game, so a doomed one is
    // re-attempted whenever any rally is recorded. Moving the timestamp with
    // each attempt would measure the recorder's activity, not the entry's
    // age, and it would never reach the expiry window.
    jest.setSystemTime(Date.now() + 60_000);
    state = pendingWritesReducer(
      state,
      pendingWritesActions.flushFailed({
        ids: ["e1"],
        retryable: false,
      }),
    );
    expect(state.pending[0]!.firstFailedAt).toBe(first);
  });

  it("leaves no failure reason behind once the entry is confirmed", () => {
    const seeded: PendingWritesState = {
      storageUnavailable: false,
      pending: [
        {
          entry: entry("e1"),
          gameId: "game-1",
          setIndex: 0,
          attempts: 3,
          nextAttemptAt: null,
          lastError: {
            code: "TRANSIENT",
            reason: "NETWORK_ERROR",
            status: 503,
          },
        },
      ],
    };

    const state = pendingWritesReducer(
      seeded,
      pendingWritesActions.flushSucceeded({ ids: ["e1"] }),
    );

    // Confirmation removes the item outright, so a stale reason cannot
    // survive it -- there is nothing left to carry one.
    expect(state.pending).toEqual([]);
  });

  it("flushFailed marks a non-retryable error as failed immediately, no backoff", () => {
    const seeded: PendingWritesState = {
      storageUnavailable: false,
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
      pendingWritesActions.flushFailed({
        ids: ["e1"],
        retryable: false,
      }),
    );

    expect(state.pending[0]!.attempts).toBe(1);
    expect(state.pending[0]!.nextAttemptAt).toBeNull();
  });

  it("retryRequested only resets items whose backoff is exhausted", () => {
    const seeded: PendingWritesState = {
      storageUnavailable: false,
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
      pendingWritesActions.retryRequested({ gameId: "game-1" }),
    );

    expect(state.pending[0]!.nextAttemptAt).toBe(Date.now());
    expect(state.pending[1]!.nextAttemptAt).toBe(
      seeded.pending[1]!.nextAttemptAt,
    );
  });

  it("retryRequested only resets the requesting game's exhausted items", () => {
    const seeded: PendingWritesState = {
      storageUnavailable: false,
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
          gameId: "game-2",
          setIndex: 0,
          attempts: 3,
          nextAttemptAt: null,
        },
      ],
    };

    const state = pendingWritesReducer(
      seeded,
      pendingWritesActions.retryRequested({ gameId: "game-1" }),
    );

    expect(state.pending[0]!.nextAttemptAt).toBe(Date.now());
    // A different game's exhausted item must stay unsynced -- resetting it
    // here would move it to "scheduled" with nothing left to attempt it,
    // since flush and the background scheduler both filter by game.
    expect(state.pending[1]!.nextAttemptAt).toBeNull();
  });
});

// The read-side merge inserts by seq but resolves a repeated id by queue
// position, so `pending` order is a contract rather than an accident.
describe("pending order", () => {
  const seeded: PendingWritesState = {
    storageUnavailable: false,
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

  it("appends an enqueued entry after what is already queued", () => {
    const state = pendingWritesReducer(
      seeded,
      pendingWritesActions.enqueued({
        entry: entry("e2"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );

    expect(state.pending.map((p) => p.entry.id)).toEqual(["e1", "e2"]);
  });

  it("puts restored entries ahead of what is in memory", () => {
    const state = pendingWritesReducer(
      seeded,
      pendingWritesActions.rehydrated({
        items: [{ entry: entry("e0"), gameId: "game-1", setIndex: 0 }],
      }),
    );

    expect(state.pending.map((p) => p.entry.id)).toEqual(["e0", "e1"]);
  });
});
