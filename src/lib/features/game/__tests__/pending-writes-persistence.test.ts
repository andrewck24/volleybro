import { EntryType, MoveType, Side } from "@/entities/game";
import { PENDING_WRITE_EXPIRY_MS } from "@/lib/features/game/pending-writes";
import {
  probePendingWritesStorage,
  restorePendingWrites,
} from "@/lib/features/game/pending-writes-persistence";
import {
  PENDING_WRITES_KEY,
  PENDING_WRITES_VERSION,
  localStoragePendingWrites,
  rememberRecorder,
  type PendingWritesStorage,
} from "@/lib/features/game/pending-writes-storage";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import type { PendingEntry, PersistedQueue } from "@/lib/features/game/types";
import { makeStore, type AppStore } from "@/lib/redux/store";
import { waitFor } from "@testing-library/react";
import { deferred } from "@test/support/gates";

const entry = (id: string): PendingEntry["entry"] => ({
  type: EntryType.RALLY,
  id,
  seq: 0,
  at: "2026-10-27T01:02:03.000Z",
  win: true,
  home: { score: 1, type: MoveType.ATTACK, num: 7 },
  away: { score: 0, type: MoveType.DEFENSE, num: 3 },
});

const fakeStorage = () => {
  const saved: PersistedQueue[] = [];
  let saveGate: ReturnType<typeof deferred> | null = null;
  const storage: PendingWritesStorage = {
    load: async () => null,
    save: async (snapshot) => {
      saved.push(snapshot);
      if (saveGate) await saveGate.promise;
    },
    clear: async () => {},
    probe: async () => {},
  };
  return {
    storage,
    saved,
    blockSaves: () => {
      saveGate = deferred();
    },
    releaseSaves: () => {
      const gate = saveGate;
      saveGate = null;
      gate?.release();
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
      version: PENDING_WRITES_VERSION,
      items: [{ entry: entry("e1"), gameId: "game-1", setIndex: 0 }],
    });

    store.dispatch(pendingWritesActions.flushSucceeded({ ids: ["e1"] }));
    await waitFor(() => expect(saved).toHaveLength(2));
    expect(saved[1]).toEqual({ version: PENDING_WRITES_VERSION, items: [] });
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
        ids: ["e1"],
        retryable: true,
        lastError: {
          code: "TRANSIENT",
          reason: "NETWORK_ERROR",
          status: 503,
        },
      }),
    );

    await waitFor(() =>
      expect(saved.at(-1)?.items[0]?.lastError).toEqual({
        code: "TRANSIENT",
        reason: "NETWORK_ERROR",
        status: 503,
      }),
    );
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

    expect(saved).toHaveLength(1);
  });

  it("leaves the newest snapshot on disk when writes overlap", async () => {
    const { storage, saved, blockSaves, releaseSaves } = fakeStorage();
    store = makeStore(storage);
    blockSaves();
    try {
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

      expect(saved).toHaveLength(1);
    } finally {
      releaseSaves();
    }
    await waitFor(() => expect(saved).toHaveLength(2));
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

    try {
      await waitFor(() =>
        expect(store.getState().pendingWrites.storageUnavailable).toBe(true),
      );
      expect(warn).toHaveBeenCalled();
      expect(store.getState().pendingWrites.pending).toHaveLength(1);
    } finally {
      warn.mockRestore();
    }
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
    await waitFor(() =>
      expect(store.getState().pendingWrites.storageUnavailable).toBe(true),
    );
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e2"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );

    try {
      await waitFor(() => expect(saved).toHaveLength(1));
      expect(saved[0]!.items.map((i) => i.entry.id)).toEqual(["e1", "e2"]);
    } finally {
      warn.mockRestore();
    }
  });
});

describe("localStoragePendingWrites", () => {
  afterEach(() => localStorage.clear());

  it("has returned by the time the bytes are on disk", async () => {
    const snapshot: PersistedQueue = {
      version: PENDING_WRITES_VERSION,
      items: [],
    };
    const saving = localStoragePendingWrites.save(snapshot);

    expect(localStorage.getItem(PENDING_WRITES_KEY)).toBe(
      JSON.stringify(snapshot),
    );
    await saving;
  });

  it("reads back what it wrote, and reports an empty store as nothing stored", async () => {
    expect(await localStoragePendingWrites.load()).toBeNull();

    const snapshot: PersistedQueue = {
      version: PENDING_WRITES_VERSION,
      items: [{ entry: entry("e1"), gameId: "game-1", setIndex: 0 }],
    };
    await localStoragePendingWrites.save(snapshot);
    expect(await localStoragePendingWrites.load()).toEqual(snapshot);

    await localStoragePendingWrites.clear();
    expect(await localStoragePendingWrites.load()).toBeNull();
  });

  it("probes with its own key and leaves the queue's untouched", async () => {
    const snapshot: PersistedQueue = {
      version: PENDING_WRITES_VERSION,
      items: [],
    };
    await localStoragePendingWrites.save(snapshot);

    await expect(localStoragePendingWrites.probe()).resolves.toBeUndefined();

    expect(localStorage.getItem(PENDING_WRITES_KEY)).toBe(
      JSON.stringify(snapshot),
    );
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

  it("fails the probe when the store accepts a write and keeps nothing", async () => {
    const getItem = jest
      .spyOn(Storage.prototype, "getItem")
      .mockReturnValue(null);

    await expect(localStoragePendingWrites.probe()).rejects.toThrow();

    getItem.mockRestore();
  });

  it("swallows recorder-hint storage failures", () => {
    const setItem = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

    try {
      expect(() => rememberRecorder("user-1")).not.toThrow();
    } finally {
      setItem.mockRestore();
    }
  });

  it("hands back unreadable stored data rather than hiding it", async () => {
    localStorage.setItem(PENDING_WRITES_KEY, "{ not json");
    expect(await localStoragePendingWrites.load()).toBe("{ not json");
  });

  it("does not swallow a failure to write", async () => {
    const setItem = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

    await expect(
      localStoragePendingWrites.save({
        version: PENDING_WRITES_VERSION,
        items: [],
      }),
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
    await waitFor(() =>
      expect(store.getState().pendingWrites.storageUnavailable).toBe(true),
    );
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
    const store = makeStore(
      stored({ version: PENDING_WRITES_VERSION, items: [persisted("e1")] }),
    );

    await restorePendingWrites(
      store.dispatch,
      stored({
        version: PENDING_WRITES_VERSION,
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
        version: PENDING_WRITES_VERSION,
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
        version: PENDING_WRITES_VERSION,
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
        version: PENDING_WRITES_VERSION,
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

  it("drops a queue written before substitutions could be queued", async () => {
    let cleared = false;
    const storage: PendingWritesStorage = {
      load: async () => ({
        version: PENDING_WRITES_VERSION - 1,
        items: [persisted("e1")],
      }),
      save: async () => {},
      clear: async () => {
        cleared = true;
      },
      probe: async () => {},
    };
    const store = makeStore(stored(null));

    await restorePendingWrites(store.dispatch, storage);

    expect(cleared).toBe(true);
    expect(store.getState().pendingWrites.pending).toEqual([]);
  });

  it("puts a queued substitution back as it was sent", async () => {
    const substitution: PendingEntry["entry"] = {
      type: EntryType.SUBSTITUTION,
      id: "sub-1",
      seq: 3,
      at: "2026-10-27T01:02:03.000Z",
      team: Side.HOME,
      players: { in: "p2", out: "p1" },
    };
    const store = makeStore(stored(null));

    await restorePendingWrites(
      store.dispatch,
      stored({
        version: PENDING_WRITES_VERSION,
        items: [{ entry: substitution, gameId: "game-1", setIndex: 0 }],
      }),
    );

    expect(store.getState().pendingWrites.pending.map((p) => p.entry)).toEqual([
      substitution,
    ]);
  });

  it("starts empty when there is nothing stored, and sends nothing", async () => {
    const store = makeStore(stored(null));
    const dispatch = jest.spyOn(store, "dispatch");

    await restorePendingWrites(store.dispatch, stored(null));
    await restorePendingWrites(
      store.dispatch,
      stored({ version: PENDING_WRITES_VERSION, items: [] }),
    );

    expect(dispatch).not.toHaveBeenCalled();
    expect(store.getState().pendingWrites.pending).toEqual([]);
    dispatch.mockRestore();
  });

  it("treats a snapshot of the wrong shape as nothing stored", async () => {
    const store = makeStore(stored(null));

    await restorePendingWrites(store.dispatch, {
      load: async () => ({
        version: PENDING_WRITES_VERSION,
        items: [{ gameId: "game-1" }],
      }),
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

    await restorePendingWrites(store.dispatch, junk("{ not json"));
    await restorePendingWrites(
      store.dispatch,
      junk({ version: PENDING_WRITES_VERSION, items: [{ gameId: "game-1" }] }),
    );

    expect(cleared).toHaveLength(2);
    expect(store.getState().pendingWrites.pending).toEqual([]);
  });

  it("discards a queued item written before entries carried an action time", async () => {
    const { at: _at, ...withoutAt } = entry("old");
    const cleared: string[] = [];
    const store = makeStore(stored(null));

    await restorePendingWrites(store.dispatch, {
      ...stored({
        version: PENDING_WRITES_VERSION,
        items: [{ entry: withoutAt as never, gameId: "game-1", setIndex: 0 }],
      }),
      clear: async () => {
        cleared.push("cleared");
      },
    });

    expect(cleared).toHaveLength(1);
    expect(store.getState().pendingWrites.pending).toEqual([]);
  });

  it("checks a newer snapshot version before validating its shape", async () => {
    let cleared = false;
    const storage: PendingWritesStorage = {
      load: async () => ({ version: 99, items: "unreadable" }),
      save: async () => {},
      clear: async () => {
        cleared = true;
      },
      probe: async () => {},
    };
    const store = makeStore(stored(null));

    await restorePendingWrites(store.dispatch, storage);

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
    await restorePendingWrites(
      store.dispatch,
      stored({ version: PENDING_WRITES_VERSION, items }),
    );
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
        version: PENDING_WRITES_VERSION,
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

    expect(store.getState().pendingWrites.pending).toEqual([]);
    expect(cleared).toBe(true);
  });

  it("writes the shorter queue back so it is not re-dropped every start", async () => {
    const saved: PersistedQueue[] = [];
    const storage: PendingWritesStorage = {
      load: async () => ({
        version: PENDING_WRITES_VERSION,
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
    await waitFor(() =>
      expect(saved.at(-1)?.items.map((i) => i.entry.id)).toEqual(["live"]),
    );
    expect(saved.at(-1)!.items.map((i) => i.entry.id)).toEqual(["live"]);
  });
});
