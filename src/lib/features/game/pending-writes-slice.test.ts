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

  it("flushStarted tracks each flushing game once, and more than one at a time", () => {
    const afterFirst = pendingWritesReducer(
      undefined,
      pendingWritesActions.flushStarted({ gameId: "game-1" }),
    );
    expect(afterFirst.flushingGameIds).toEqual(["game-1"]);

    const afterRepeat = pendingWritesReducer(
      afterFirst,
      pendingWritesActions.flushStarted({ gameId: "game-1" }),
    );
    expect(afterRepeat.flushingGameIds).toEqual(["game-1"]);

    const afterSecondGame = pendingWritesReducer(
      afterRepeat,
      pendingWritesActions.flushStarted({ gameId: "game-2" }),
    );
    expect(afterSecondGame.flushingGameIds).toEqual(["game-1", "game-2"]);
  });

  it("flushSucceeded removes only the confirmed ids and clears flushing for that game only", () => {
    const seeded: PendingWritesState = {
      flushingGameIds: ["game-1", "game-2"],
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
      pendingWritesActions.flushSucceeded({ gameId: "game-1", ids: ["e1"] }),
    );

    expect(state.pending.map((p) => p.entry.id)).toEqual(["e2"]);
    expect(state.flushingGameIds).toEqual(["game-2"]);
  });

  it("flushFailed schedules the next background delay by attempt count, and clears flushing for that game only", () => {
    const seeded: PendingWritesState = {
      // Two games seeded so clearing "game-1" here can be told apart from a
      // bug that wipes the whole array -- the single-element fixture this
      // replaced could not distinguish scoped from unscoped clearing.
      flushingGameIds: ["game-1", "game-2"],
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
        gameId: "game-1",
        ids: ["e1"],
        retryable: true,
      }),
    );

    expect(state.pending[0]!.attempts).toBe(1);
    expect(state.pending[0]!.nextAttemptAt).toBe(
      Date.now() + PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS[0]!,
    );
    expect(state.flushingGameIds).toEqual(["game-2"]);

    for (let i = 1; i < PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS.length; i++) {
      state = pendingWritesReducer(
        state,
        pendingWritesActions.flushFailed({
          gameId: "game-1",
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
        gameId: "game-1",
        ids: ["e1"],
        retryable: true,
      }),
    );
    expect(state.pending[0]!.nextAttemptAt).toBeNull();
    expect(deriveSyncStatus(state, "game-1")).toBe("unsynced");
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
        gameId: "game-1",
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
        gameId: "game-1",
        ids: ["e1"],
        retryable: true,
      }),
    );
    expect(failedAgain.pending[0]!.lastError).toBeUndefined();
  });

  it("leaves no failure reason behind once the entry is confirmed", () => {
    const seeded: PendingWritesState = {
      flushingGameIds: [],
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
      pendingWritesActions.flushSucceeded({ gameId: "game-1", ids: ["e1"] }),
    );

    // Confirmation removes the item outright, so a stale reason cannot
    // survive it -- there is nothing left to carry one.
    expect(state.pending).toEqual([]);
  });

  it("flushFailed marks a non-retryable error as failed immediately, no backoff", () => {
    const seeded: PendingWritesState = {
      flushingGameIds: ["game-1"],
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
        gameId: "game-1",
        ids: ["e1"],
        retryable: false,
      }),
    );

    expect(state.pending[0]!.attempts).toBe(1);
    expect(state.pending[0]!.nextAttemptAt).toBeNull();
  });

  it("retryRequested only resets items whose backoff is exhausted", () => {
    const seeded: PendingWritesState = {
      flushingGameIds: [],
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
      flushingGameIds: [],
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
