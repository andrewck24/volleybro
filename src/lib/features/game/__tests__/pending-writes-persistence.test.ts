import {
  PENDING_WRITES_KEY,
  localStoragePendingWrites,
  type PendingWritesStorage,
} from "@/lib/features/game/pending-writes-storage";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import type { PendingEntry, PersistedQueue } from "@/lib/features/game/types";
import { makeStore, type AppStore } from "@/lib/redux/store";

// Consecutive dispatches inside one tick coalesce by design, so anything
// asserting a later snapshot has to let the microtask queue drain first.
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

const entry = (id: string) =>
  ({ id, seq: 0, win: true, home: {}, away: {} }) as PendingEntry["entry"];

const fakeStorage = () => {
  const saved: PersistedQueue[] = [];
  let release: (() => void) | null = null;
  const storage: PendingWritesStorage = {
    load: async () => null,
    save: async (snapshot) => {
      saved.push(snapshot);
      // Held open on demand so a burst can be observed mid-write; resolved
      // immediately otherwise, matching a synchronous store.
      if (release) await new Promise<void>((r) => (release = r));
    },
    clear: async () => {},
  };
  return {
    storage,
    saved,
    hold: () => {
      release = () => {};
    },
    let_go: () => {
      const r = release;
      release = null;
      r?.();
    },
  };
};

describe("pending-writes persistence", () => {
  let store: AppStore;

  it("writes a snapshot when an entry is queued, and again when it leaves", async () => {
    const { storage, saved } = fakeStorage();
    store = makeStore(storage);

    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    expect(saved).toHaveLength(1);
    expect(saved[0]).toEqual({
      version: 1,
      items: [{ entry: entry("e1"), gameId: "game-1", setIndex: 0 }],
    });

    store.dispatch(
      pendingWritesActions.flushSucceeded({ gameId: "game-1", ids: ["e1"] }),
    );
    await settled();
    expect(saved).toHaveLength(2);
    expect(saved[1]).toEqual({ version: 1, items: [] });
  });

  it("writes the failure reason but neither the schedule nor what is on the wire", async () => {
    const { storage, saved } = fakeStorage();
    store = makeStore(storage);

    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 2,
      }),
    );
    store.dispatch(
      pendingWritesActions.flushFailed({
        gameId: "game-1",
        ids: ["e1"],
        retryable: true,
        lastError: {
          code: "TRANSIENT",
          reason: "NETWORK_ERROR",
          status: 503,
        },
      }),
    );

    await settled();
    const last = saved.at(-1)!;
    expect(last.items[0]).toEqual({
      entry: entry("e1"),
      gameId: "game-1",
      setIndex: 2,
      lastError: { code: "TRANSIENT", reason: "NETWORK_ERROR", status: 503 },
    });
    // Recomputed on restore, so storing them would only be a second copy that
    // is already wrong by the time it is read.
    expect(last.items[0]).not.toHaveProperty("attempts");
    expect(last.items[0]).not.toHaveProperty("nextAttemptAt");
    expect(last).not.toHaveProperty("flushingGameIds");
  });

  it("ignores dispatches that do not change the queue's contents", async () => {
    const { storage, saved } = fakeStorage();
    store = makeStore(storage);

    store.dispatch(pendingWritesActions.flushStarted({ gameId: "game-1" }));
    store.dispatch(pendingWritesActions.retryRequested({ gameId: "game-1" }));

    expect(saved).toHaveLength(0);
  });

  it("writes synchronously, so the queue is on disk before anything awaits", () => {
    const { storage, saved } = fakeStorage();
    store = makeStore(storage);

    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );

    // No await between the dispatch and this assertion: had the write been
    // deferred to a microtask, an app killed in that window would lose the
    // rally the recorder has already seen accepted.
    expect(saved).toHaveLength(1);
  });

  it("leaves the newest snapshot on disk when writes overlap", async () => {
    const { storage, saved, hold, let_go } = fakeStorage();
    store = makeStore(storage);
    hold();

    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e2"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e3"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );

    // The first write is still open, so the two behind it collapse: each
    // snapshot is complete, so only the newest is worth writing.
    expect(saved).toHaveLength(1);

    let_go();
    await settled();

    expect(saved).toHaveLength(2);
    expect(saved.at(-1)!.items.map((i) => i.entry.id)).toEqual([
      "e1",
      "e2",
      "e3",
    ]);
  });

  it("survives an unwritable store instead of taking the app down", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const storage: PendingWritesStorage = {
      load: async () => null,
      save: async () => {
        throw new Error("QuotaExceededError");
      },
      clear: async () => {},
    };
    store = makeStore(storage);

    expect(() =>
      store.dispatch(
        pendingWritesActions.enqueued({
          entry: entry("e1"),
          gameId: "game-1",
          setIndex: 0,
        }),
      ),
    ).not.toThrow();

    await settled();
    expect(warn).toHaveBeenCalled();
    // The queue itself is untouched -- storage failing does not lose the
    // rally from memory, it only leaves it unprotected against a restart.
    expect(store.getState().pendingWrites.pending).toHaveLength(1);
    warn.mockRestore();
  });

  it("a failed write does not stall the writes behind it", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const saved: PersistedQueue[] = [];
    let fail = true;
    const storage: PendingWritesStorage = {
      load: async () => null,
      save: async (snapshot) => {
        if (fail) {
          fail = false;
          throw new Error("QuotaExceededError");
        }
        saved.push(snapshot);
      },
      clear: async () => {},
    };
    store = makeStore(storage);

    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    await settled();
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e2"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );

    await settled();
    expect(saved).toHaveLength(1);
    expect(saved[0]!.items.map((i) => i.entry.id)).toEqual(["e1", "e2"]);
    warn.mockRestore();
  });
});

describe("localStoragePendingWrites", () => {
  afterEach(() => localStorage.clear());

  it("has returned by the time the bytes are on disk", async () => {
    const snapshot: PersistedQueue = { version: 1, items: [] };
    const saving = localStoragePendingWrites.save(snapshot);

    // Read before awaiting: the synchronous setItem runs inside the async
    // body, so the data is already there.
    expect(localStorage.getItem(PENDING_WRITES_KEY)).toBe(
      JSON.stringify(snapshot),
    );
    await saving;
  });

  it("reads back what it wrote, and reports an empty store as nothing stored", async () => {
    expect(await localStoragePendingWrites.load()).toBeNull();

    const snapshot: PersistedQueue = {
      version: 1,
      items: [{ entry: entry("e1"), gameId: "game-1", setIndex: 0 }],
    };
    await localStoragePendingWrites.save(snapshot);
    expect(await localStoragePendingWrites.load()).toEqual(snapshot);

    await localStoragePendingWrites.clear();
    expect(await localStoragePendingWrites.load()).toBeNull();
  });

  it("treats unreadable stored data as nothing stored", async () => {
    localStorage.setItem(PENDING_WRITES_KEY, "{ not json");
    expect(await localStoragePendingWrites.load()).toBeNull();
  });

  it("does not swallow a failure to write", async () => {
    const setItem = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

    await expect(
      localStoragePendingWrites.save({ version: 1, items: [] }),
    ).rejects.toThrow("QuotaExceededError");

    setItem.mockRestore();
  });
});
