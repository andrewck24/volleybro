import {
  deriveSyncStatus,
  hasFailedWrite,
  isPendingWrite,
  mergePendingEntries,
  nextAttemptDelayMs,
  PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS,
} from "@/lib/features/game/pending-writes";
import type {
  GameView,
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
  // The same judgement the indicator's warning tone uses: an exhausted
  // backoff is not enough, because those entries send themselves on the next
  // flush. Only an entry nothing can send carries the marker.
  it("is true only for an entry that cannot be attempted again", () => {
    const state = stateOf([
      makePendingEntry({
        entry: { id: "e1" } as never,
        attempts: 1,
        lastError: notRetryable as never,
      }),
      makePendingEntry({
        entry: { id: "e2" } as never,
        attempts: 4,
        nextAttemptAt: null,
        lastError: retryable as never,
      }),
    ]);
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

const makeGame = (entrySeqs: number[][]): GameView =>
  ({
    id: "game-1",
    win: null,
    sets: entrySeqs.map((seqs) => ({
      win: null,
      entries: seqs.map((seq) => ({ type: "rally", id: `s${seq}`, seq })),
    })),
  }) as never;

const queued = (
  id: string,
  seq: number,
  overrides: Partial<PendingEntry> = {},
) =>
  makePendingEntry({
    entry: { id, seq, win: true, home: {}, away: {} } as never,
    ...overrides,
  });

const seqsOf = (game: GameView | undefined, setIndex = 0) =>
  game?.sets[setIndex]?.entries.map((e) => e.id);

describe("mergePendingEntries", () => {
  it("returns the same game when nothing is queued for it", () => {
    const game = makeGame([[0, 1]]);
    expect(mergePendingEntries(game, [], "game-1")).toBe(game);
    expect(mergePendingEntries(game, [queued("q", 2)], "game-2")).toBe(game);
  });

  it("inserts a queued entry at its seq rather than at the end", () => {
    const merged = mergePendingEntries(
      makeGame([[0, 2]]),
      [queued("q", 1)],
      "game-1",
    );
    expect(seqsOf(merged)).toEqual(["s0", "q", "s2"]);
  });

  it("replaces an entry the server already holds under the same id", () => {
    const merged = mergePendingEntries(
      makeGame([[0, 1]]),
      [queued("s1", 1)],
      "game-1",
    );
    expect(seqsOf(merged)).toEqual(["s0", "s1"]);
    expect(merged?.sets[0]?.entries[1]).toMatchObject({ win: true });
  });

  it("takes the last queued item when one id is queued twice", () => {
    const merged = mergePendingEntries(
      makeGame([[0]]),
      [
        queued("q", 1, { attempts: 1 }),
        makePendingEntry({
          entry: { id: "q", seq: 1, win: false, home: {}, away: {} } as never,
        }),
      ],
      "game-1",
    );
    expect(seqsOf(merged)).toEqual(["s0", "q"]);
    expect(merged?.sets[0]?.entries[1]).toMatchObject({ win: false });
  });

  it("merges each set's queue into that set only", () => {
    const merged = mergePendingEntries(
      makeGame([[0], [0]]),
      [queued("q", 1, { setIndex: 1 })],
      "game-1",
    );
    expect(seqsOf(merged, 0)).toEqual(["s0"]);
    expect(seqsOf(merged, 1)).toEqual(["s0", "q"]);
  });

  it("leaves win alone", () => {
    const game = makeGame([[0]]);
    game.win = null;
    const merged = mergePendingEntries(game, [queued("q", 1)], "game-1");
    expect(merged?.win).toBeNull();
    expect(merged?.sets[0]?.win).toBeNull();
  });

  it("does not touch the game it was given", () => {
    const game = makeGame([[0]]);
    const before = JSON.stringify(game);
    mergePendingEntries(game, [queued("q", 1)], "game-1");
    expect(JSON.stringify(game)).toBe(before);
  });

  it("merges an entry that can never be sent, so its failure can be shown", () => {
    const merged = mergePendingEntries(
      makeGame([[0]]),
      [
        queued("q", 1, {
          nextAttemptAt: null,
          lastError: notRetryable as never,
        }),
      ],
      "game-1",
    );
    expect(seqsOf(merged)).toEqual(["s0", "q"]);
  });

  it("returns undefined while the game has not loaded", () => {
    expect(
      mergePendingEntries(undefined, [queued("q", 1)], "game-1"),
    ).toBeUndefined();
  });
});
