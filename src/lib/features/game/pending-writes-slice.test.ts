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

  it("flushStarted adds the game to flushingGameIds", () => {
    const state = pendingWritesReducer(
      undefined,
      pendingWritesActions.flushStarted({ gameId: "game-1" }),
    );
    expect(state.flushingGameIds).toEqual(["game-1"]);
  });

  it("flushStarted tracks more than one game flushing at once", () => {
    let state = pendingWritesReducer(
      undefined,
      pendingWritesActions.flushStarted({ gameId: "game-1" }),
    );
    state = pendingWritesReducer(
      state,
      pendingWritesActions.flushStarted({ gameId: "game-2" }),
    );
    expect([...state.flushingGameIds].sort()).toEqual(["game-1", "game-2"]);
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

  it("flushFailed schedules the next background delay by attempt count", () => {
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
    expect(state.flushingGameIds).toEqual([]);

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
