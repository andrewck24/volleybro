import { MoveType } from "@/entities/game";
import { PENDING_WRITE_EXPIRY_MS } from "@/lib/features/game/pending-writes";
import {
  probePendingWritesStorage,
  restorePendingWrites,
} from "@/lib/features/game/pending-writes-persistence";
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

// A real rally shape, not a cast: restore parses what it reads, so a fixture
// that could never have been stored would not survive the round trip.
const entry = (id: string): PendingEntry["entry"] => ({
  id,
  seq: 0,
  win: true,
  home: { score: 1, type: MoveType.ATTACK, num: 7 },
  away: { score: 0, type: MoveType.DEFENSE, num: 3 },
});

const fakeStorage = () => {
  const saved: PersistedQueue[] = [];
  let release: (() => void) | null = null;
  const storage: PendingWritesStorage = {
    load: async () => null,
    save: async (snapshot) => {
      saved.push(snapshot);
      if (release) await new Promise<void>((r) => (release = r));
    },
    clear: async () => {},
    probe: async () => {},
  };
  return {
    storage,
    saved,
    // Holds the next save open so a burst of dispatches can be observed
    // while one write is still in flight.
    blockSaves: () => {
      release = () => {};
    },
    releaseSaves: () => {
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
      firstFailedAt: expect.any(Number),
    });
    expect(last.items[0]).not.toHaveProperty("attempts");
    expect(last.items[0]).not.toHaveProperty("nextAttemptAt");
    expect(last).not.toHaveProperty("storageUnavailable");
  });

  it("ignores dispatches that do not change the queue's contents", async () => {
    const { storage, saved } = fakeStorage();
    store = makeStore(storage);

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
    const { storage, saved, blockSaves, releaseSaves } = fakeStorage();
    store = makeStore(storage);
    blockSaves();

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

    // The first write is still open, so the two behind it collapse.
    expect(saved).toHaveLength(1);

    releaseSaves();
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
      probe: async () => {},
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
    // Storage failing does not lose the rally, only its protection.
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
      probe: async () => {},
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

  it("probes with its own key and leaves the queue's untouched", async () => {
    const snapshot: PersistedQueue = { version: 1, items: [] };
    await localStoragePendingWrites.save(snapshot);

    await expect(localStoragePendingWrites.probe()).resolves.toBeUndefined();

    expect(localStorage.getItem(PENDING_WRITES_KEY)).toBe(
      JSON.stringify(snapshot),
    );
    // Nothing of the probe's own is left behind.
    expect(localStorage.length).toBe(1);
  });

  it("fails the probe when the store throws on a write", async () => {
    const setItem = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

    await expect(localStoragePendingWrites.probe()).rejects.toThrow();

    setItem.mockRestore();
  });

  // Safari's private mode hands out an ephemeral quota rather than throwing,
  // so a bare setItem would report an unusable store as healthy. Reading back
  // is the half that catches it.
  it("fails the probe when the store accepts a write and keeps nothing", async () => {
    const getItem = jest
      .spyOn(Storage.prototype, "getItem")
      .mockReturnValue(null);

    await expect(localStoragePendingWrites.probe()).rejects.toThrow();

    getItem.mockRestore();
  });

  it("hands back unreadable stored data rather than hiding it", async () => {
    localStorage.setItem(PENDING_WRITES_KEY, "{ not json");
    // Not null: the caller has to be able to tell "nothing stored" from
    // "something stored that nobody can use", so it can clear the latter.
    expect(await localStoragePendingWrites.load()).toBe("{ not json");
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

describe("probePendingWritesStorage", () => {
  const storageWith = (probe: () => Promise<void>) => ({
    load: async () => null,
    save: async () => {},
    clear: async () => {},
    probe,
  });

  it("leaves the flag alone when the store can hold something", async () => {
    const store = makeStore();

    await probePendingWritesStorage(
      store.dispatch,
      storageWith(async () => {}),
    );

    expect(store.getState().pendingWrites.storageUnavailable).toBe(false);
  });

  // Reported before the first rally, which is the only point at which the
  // recorder still has moves available -- leaving private browsing, freeing
  // space, or picking up another device.
  it("records an unwritable store rather than letting the failure through", async () => {
    const store = makeStore();

    await expect(
      probePendingWritesStorage(
        store.dispatch,
        storageWith(async () => {
          throw new Error("quota");
        }),
      ),
    ).resolves.toBeUndefined();

    expect(store.getState().pendingWrites.storageUnavailable).toBe(true);
  });
});

describe("the queue's own save failing", () => {
  it("reports the store as unwritable, because it can fail after a clean probe", async () => {
    // A quota another origin fills mid-match is the ordinary way this
    // happens: start-up said yes and the store still stopped keeping things.
    const store = makeStore({
      load: async () => null,
      save: async () => {
        throw new Error("quota");
      },
      clear: async () => {},
      probe: async () => {},
    });

    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    await settled();

    expect(store.getState().pendingWrites.storageUnavailable).toBe(true);
  });
});

describe("restorePendingWrites", () => {
  const stored = (snapshot: PersistedQueue | null): PendingWritesStorage => ({
    load: async () => snapshot,
    save: async () => {},
    clear: async () => {},
    probe: async () => {},
  });

  const persisted = (
    id: string,
    lastError?: PersistedQueue["items"][number]["lastError"],
  ) => ({
    entry: entry(id),
    gameId: "game-1",
    setIndex: 0,
    ...(lastError ? { lastError } : {}),
  });

  it("puts a previous run's entries back, ready to send", async () => {
    const store = makeStore(stored({ version: 1, items: [persisted("e1")] }));

    await restorePendingWrites(
      store.dispatch,
      stored({
        version: 1,
        items: [persisted("e1")],
      }),
    );

    expect(store.getState().pendingWrites.pending).toEqual([
      {
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 0,
        attempts: 0,
        nextAttemptAt: expect.any(Number),
      },
    ]);
  });

  it("never loses a rally recorded while the read was still in flight", async () => {
    const store = makeStore(stored(null));
    // The recorder gets ahead of the asynchronous read -- the exact window
    // the merge exists for. Overwriting here would drop e2 silently.
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e2"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );

    await restorePendingWrites(
      store.dispatch,
      stored({
        version: 1,
        items: [persisted("e1"), persisted("e2")],
      }),
    );

    const ids = store.getState().pendingWrites.pending.map((p) => p.entry.id);
    expect(ids).toEqual(["e1", "e2"]);
  });

  it("keeps the in-memory copy when both have the same entry", async () => {
    const store = makeStore(stored(null));
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 3,
      }),
    );

    await restorePendingWrites(
      store.dispatch,
      stored({
        version: 1,
        items: [{ ...persisted("e1"), setIndex: 0 }],
      }),
    );

    expect(store.getState().pendingWrites.pending).toHaveLength(1);
    expect(store.getState().pendingWrites.pending[0]!.setIndex).toBe(3);
  });

  it("schedules a restored entry by whether sending it again could work", async () => {
    const store = makeStore(stored(null));

    await restorePendingWrites(
      store.dispatch,
      stored({
        version: 1,
        items: [
          persisted("transient", {
            code: "TRANSIENT",
            reason: "NETWORK_ERROR",
            status: 503,
          }),
          persisted("expired-session", {
            code: "AUTHENTICATION",
            reason: "SESSION_REQUIRED",
            status: 401,
          }),
          persisted("deleted-game", {
            code: "NOT_FOUND",
            reason: "GAME_NOT_FOUND",
            status: 404,
          }),
        ],
      }),
    );

    const due = Object.fromEntries(
      store
        .getState()
        .pendingWrites.pending.map((p) => [p.entry.id, p.nextAttemptAt]),
    );
    expect(due.transient).toEqual(expect.any(Number));
    // One standard, applied everywhere: a 4xx is not scheduled, and that
    // includes an expired session. It stays queued and visible, and the
    // recorder's retry gesture sends it once they have signed back in.
    expect(due["expired-session"]).toBeNull();
    expect(due["deleted-game"]).toBeNull();
  });

  it("discards a snapshot this build does not understand", async () => {
    const store = makeStore(stored(null));

    await restorePendingWrites(
      store.dispatch,
      stored({
        version: 99,
        items: [persisted("e1")],
      }),
    );

    expect(store.getState().pendingWrites.pending).toEqual([]);
  });

  it("starts empty when there is nothing stored, and sends nothing", async () => {
    const store = makeStore(stored(null));
    const dispatch = jest.spyOn(store, "dispatch");

    await restorePendingWrites(store.dispatch, stored(null));
    await restorePendingWrites(
      store.dispatch,
      stored({ version: 1, items: [] }),
    );

    expect(dispatch).not.toHaveBeenCalled();
    expect(store.getState().pendingWrites.pending).toEqual([]);
    dispatch.mockRestore();
  });

  it("treats a snapshot of the wrong shape as nothing stored", async () => {
    const store = makeStore(stored(null));

    // Valid JSON, wrong shape. Storage is writable by anything on this
    // origin, and whatever comes back goes on to be sent to the server.
    await restorePendingWrites(store.dispatch, {
      load: async () => ({ version: 1, items: [{ gameId: "game-1" }] }),
      save: async () => {},
      clear: async () => {},
      probe: async () => {},
    });
    await restorePendingWrites(store.dispatch, {
      load: async () => "not an object at all",
      save: async () => {},
      clear: async () => {},
      probe: async () => {},
    });

    expect(store.getState().pendingWrites.pending).toEqual([]);
  });

  it("clears anything stored that it cannot use", async () => {
    const cleared: string[] = [];
    const junk = (value: unknown): PendingWritesStorage => ({
      load: async () => value,
      save: async () => {},
      clear: async () => {
        cleared.push("cleared");
      },
      probe: async () => {},
    });
    const store = makeStore(stored(null));

    // Both are dead to every future build too, so neither is left behind.
    await restorePendingWrites(store.dispatch, junk("{ not json"));
    await restorePendingWrites(
      store.dispatch,
      junk({ version: 1, items: [{ gameId: "game-1" }] }),
    );

    expect(cleared).toHaveLength(2);
    expect(store.getState().pendingWrites.pending).toEqual([]);
  });

  it("leaves a snapshot from a newer build alone", async () => {
    let cleared = false;
    const storage: PendingWritesStorage = {
      load: async () => ({ version: 99, items: [] }),
      save: async () => {},
      clear: async () => {
        cleared = true;
      },
      probe: async () => {},
    };
    const store = makeStore(stored(null));

    await restorePendingWrites(store.dispatch, storage);

    // A build the user may also be running could own it, and this is the one
    // place where guessing wrong destroys unsent work.
    expect(cleared).toBe(false);
    expect(store.getState().pendingWrites.pending).toEqual([]);
  });

  it("treats an unreadable store as nothing stored", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const store = makeStore(stored(null));

    await restorePendingWrites(store.dispatch, {
      load: async () => {
        throw new Error("SecurityError");
      },
      save: async () => {},
      clear: async () => {},
      probe: async () => {},
    });

    expect(store.getState().pendingWrites.pending).toEqual([]);
    warn.mockRestore();
  });
});

describe("restorePendingWrites expiry", () => {
  const stored = (snapshot: PersistedQueue | null): PendingWritesStorage => ({
    load: async () => snapshot,
    save: async () => {},
    clear: async () => {},
    probe: async () => {},
  });

  const aged = (
    id: string,
    age: number,
    lastError?: PersistedQueue["items"][number]["lastError"],
  ) => ({
    entry: entry(id),
    gameId: "game-1",
    setIndex: 0,
    firstFailedAt: Date.now() - age,
    ...(lastError ? { lastError } : {}),
  });

  const restore = async (items: PersistedQueue["items"]) => {
    const store = makeStore(stored(null));
    await restorePendingWrites(store.dispatch, stored({ version: 1, items }));
    return store.getState().pendingWrites.pending.map((p) => p.entry.id);
  };

  const week = PENDING_WRITE_EXPIRY_MS;
  const deleted = {
    code: "NOT_FOUND" as const,
    reason: "GAME_NOT_FOUND",
    status: 404,
  };
  const transient = {
    code: "TRANSIENT" as const,
    reason: "NETWORK_ERROR",
    status: 503,
  };

  it("drops an entry that cannot succeed once it is older than the window", async () => {
    expect(await restore([aged("stale", week + 1000, deleted)])).toEqual([]);
  });

  it("keeps one that cannot succeed but is still inside the window", async () => {
    expect(await restore([aged("recent", week - 1000, deleted)])).toEqual([
      "recent",
    ]);
  });

  it("keeps work that might still land however long it has waited", async () => {
    // A week-long tournament without signal is when the queue has to hold.
    expect(await restore([aged("offline", week * 4, transient)])).toEqual([
      "offline",
    ]);
  });

  it("gives an expired session the window, then drops it like any other 4xx", async () => {
    const session = {
      code: "AUTHENTICATION" as const,
      reason: "SESSION_REQUIRED",
      status: 401,
    };

    expect(await restore([aged("recent", week - 1000, session)])).toEqual([
      "recent",
    ]);
    expect(await restore([aged("stale", week + 1000, session)])).toEqual([]);
  });

  it("never drops an entry that has not failed at all", async () => {
    expect(
      await restore([{ entry: entry("fresh"), gameId: "game-1", setIndex: 0 }]),
    ).toEqual(["fresh"]);
  });

  it("clears the store when nothing at all survives", async () => {
    let cleared = false;
    const storage: PendingWritesStorage = {
      load: async () => ({
        version: 1,
        items: [aged("stale", week + 1000, deleted)],
      }),
      save: async () => {},
      clear: async () => {
        cleared = true;
      },
      probe: async () => {},
    };
    const store = makeStore(storage);

    await restorePendingWrites(store.dispatch, storage);

    // Nothing is dispatched, so the listener never writes the shorter queue
    // back -- without the clear it would be re-read on every start.
    expect(store.getState().pendingWrites.pending).toEqual([]);
    expect(cleared).toBe(true);
  });

  it("writes the shorter queue back so it is not re-dropped every start", async () => {
    const saved: PersistedQueue[] = [];
    const storage: PendingWritesStorage = {
      load: async () => ({
        version: 1,
        items: [
          aged("stale", week + 1000, deleted),
          aged("live", 0, transient),
        ],
      }),
      save: async (snapshot) => {
        saved.push(snapshot);
      },
      clear: async () => {},
      probe: async () => {},
    };
    const store = makeStore(storage);

    await restorePendingWrites(store.dispatch, storage);
    await settled();

    expect(saved.at(-1)!.items.map((i) => i.entry.id)).toEqual(["live"]);
  });
});
