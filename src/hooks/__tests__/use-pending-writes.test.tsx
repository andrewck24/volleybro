import { act, render, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Provider } from "react-redux";
import { useGame } from "@/hooks/use-data";
import {
  PendingWritesContext,
  usePendingWrites,
  usePendingWritesContext,
} from "@/hooks/use-pending-writes";
import { EntryType } from "@/entities/game";
import {
  PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS,
  PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS,
} from "@/lib/features/game/pending-writes";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import type { PendingEntry } from "@/lib/features/game/types";
import { makeStore, type AppStore } from "@/lib/redux/store";
import { SwrIsolation } from "@/test-utils/swr-isolation";

import { server } from "../../../test/msw/server";

const entry = (id: string) =>
  ({ id, seq: 0, win: true, home: {}, away: {} }) as PendingEntry["entry"];

const rally = (id: string) => ({ type: EntryType.RALLY, ...entry(id) });

const storedGame = () => ({
  id: "game-1",
  win: null,
  sets: [
    { win: null, entries: [] },
    { win: null, entries: [] },
  ],
});

const confirmed = (...ids: string[]) => ({ entries: ids.map(rally) });

const unavailable = () =>
  HttpResponse.json(
    { code: "TRANSIENT", reason: "NETWORK_ERROR" },
    { status: 503 },
  );

/**
 * Serves the game and its rally endpoint, and records each PUT. `respond`
 * decides the answer to each one.
 */
const serve = (
  respond: (put: { si: number; n: number }) => Response | Promise<Response>,
) => {
  const puts: { si: number; ids: string[] }[] = [];
  server.use(
    http.get("/api/games/game-1", () => HttpResponse.json(storedGame())),
    http.put("/api/games/game-1/sets/rallies", async ({ request }) => {
      const si = Number(new URL(request.url).searchParams.get("si"));
      const body = (await request.json()) as { id: string }[];
      puts.push({ si, ids: body.map((e) => e.id) });
      return respond({ si, n: puts.length });
    }),
  );
  return puts;
};

// A request settles on real I/O ticks, so under fake timers the clock is
// stepped with a real pause between steps until the condition holds.
const realSetTimeout = globalThis.setTimeout;
const advanceUntil = async (condition: () => boolean) => {
  for (let i = 0; i < 400 && !condition(); i++) {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(50);
    });
    await new Promise((resolve) => realSetTimeout(resolve, 2));
  }
  expect(condition()).toBe(true);
};
const advanceUntilSettled = (promise: Promise<unknown>) => {
  let settled = false;
  void promise.finally(() => {
    settled = true;
  });
  return advanceUntil(() => settled);
};

let store: AppStore;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <SwrIsolation>{children}</SwrIsolation>
  </Provider>
);

const renderQueue = (setIndex = 0) =>
  renderHook(
    () => ({
      queue: usePendingWrites("game-1", setIndex),
      game: useGame("game-1"),
    }),
    { wrapper },
  );

const pendingIds = () =>
  store.getState().pendingWrites.pending.map((p) => p.entry.id);

const enqueueDirectly = (id: string, setIndex: number) =>
  store.dispatch(
    pendingWritesActions.enqueued({
      entry: entry(id),
      gameId: "game-1",
      setIndex,
    }),
  );

beforeEach(() => {
  store = makeStore();
});

describe("usePendingWrites", () => {
  it("enqueue + flush sends the entry once, writes the server's entries to the game and empties the queue", async () => {
    const puts = serve(() => HttpResponse.json(confirmed("e1")));
    const { result } = renderQueue();
    await waitFor(() => expect(result.current.game.game).toBeDefined());

    act(() => result.current.queue.enqueue(entry("e1")));
    await act(async () => {
      await result.current.queue.flush();
    });

    expect(puts).toEqual([{ si: 0, ids: ["e1"] }]);
    expect(pendingIds()).toEqual([]);
    await waitFor(() =>
      expect(result.current.game.game?.sets[0]?.entries).toEqual([rally("e1")]),
    );
  });

  it.each([
    [
      "records the set-completion result when the response carries it",
      false,
      false,
    ],
    [
      "leaves the set-completion result untouched when the response omits it",
      undefined,
      undefined,
    ],
  ])("%s", async (_name, setCompletionConfirmed, expected) => {
    serve(() =>
      HttpResponse.json({ ...confirmed("e1"), setCompletionConfirmed }),
    );
    const { result } = renderQueue();

    act(() => result.current.queue.enqueue(entry("e1")));
    await act(async () => {
      await result.current.queue.flush();
    });

    expect(store.getState().setCompletion["game-1:0"]).toBe(expected);
  });

  it("dedupes concurrent flush calls into a single in-flight request", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const puts = serve(async () => {
      await gate;
      return HttpResponse.json(confirmed("e1"));
    });
    const { result } = renderQueue();

    act(() => result.current.queue.enqueue(entry("e1")));
    let first!: Promise<unknown>;
    let second!: Promise<unknown>;
    act(() => {
      first = result.current.queue.flush();
      second = result.current.queue.flush();
    });
    await waitFor(() => expect(puts).toHaveLength(1));
    // A second request, if one were made, arrives right behind the first.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(puts).toHaveLength(1);

    await act(async () => {
      release();
      await Promise.all([first, second]);
    });
    expect(pendingIds()).toEqual([]);
  });

  describe("with backoff", () => {
    beforeEach(() => {
      // With process.nextTick faked, fetch never settles under MSW.
      jest.useFakeTimers({ doNotFake: ["nextTick"] });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("schedules a background retry after a retryable failure and eventually writes once", async () => {
      const puts = serve(({ n }) =>
        n <= 3 ? unavailable() : HttpResponse.json(confirmed("e1")),
      );
      const { result } = renderQueue();

      act(() => result.current.queue.enqueue(entry("e1")));
      let flushed!: Promise<unknown>;
      act(() => {
        flushed = result.current.queue.flush();
      });
      await advanceUntilSettled(flushed);

      // Inline retries exhausted; the item now waits on the background schedule.
      expect(puts).toHaveLength(
        PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS.length + 1,
      );
      expect(store.getState().pendingWrites.pending[0]!.nextAttemptAt).not.toBe(
        null,
      );

      await act(async () => {
        await jest.advanceTimersByTimeAsync(
          PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS[0]!,
        );
      });
      await advanceUntil(() => pendingIds().length === 0);

      expect(puts).toHaveLength(4);
    });

    it("flushes an entry queued while offline exactly once when connectivity returns", async () => {
      const puts = serve(({ n }) =>
        n <= 3 ? unavailable() : HttpResponse.json(confirmed("e1")),
      );
      const { result } = renderQueue();

      act(() => result.current.queue.enqueue(entry("e1")));
      let flushed!: Promise<unknown>;
      act(() => {
        flushed = result.current.queue.flush();
      });
      await advanceUntilSettled(flushed);
      expect(puts).toHaveLength(3);
      expect(pendingIds()).toEqual(["e1"]);

      let online!: Promise<unknown>;
      act(() => {
        window.dispatchEvent(new Event("online"));
        // The online listener's flush is already in flight; flush() dedupes
        // to the same promise, so awaiting it waits for that request.
        online = result.current.queue.flush();
      });
      await advanceUntilSettled(online);

      expect(puts).toHaveLength(4);
      expect(pendingIds()).toEqual([]);
    });

    it("records each set's own failure reason on that set's entries", async () => {
      serve(({ si }) =>
        si === 0
          ? HttpResponse.json(
              { code: "AUTHENTICATION", reason: "SESSION_REQUIRED" },
              { status: 401 },
            )
          : unavailable(),
      );
      enqueueDirectly("e0", 0);
      const { result } = renderQueue(1);
      act(() => result.current.queue.enqueue(entry("e1")));

      let flushed!: Promise<unknown>;
      act(() => {
        flushed = result.current.queue.flush();
      });
      await advanceUntilSettled(flushed);

      const byId = Object.fromEntries(
        store
          .getState()
          .pendingWrites.pending.map((p) => [p.entry.id, p.lastError]),
      );
      expect(byId.e0).toEqual({
        code: "AUTHENTICATION",
        reason: "SESSION_REQUIRED",
        status: 401,
      });
      expect(byId.e1).toEqual({
        code: "TRANSIENT",
        reason: "NETWORK_ERROR",
        status: 503,
      });
    });

    it("still schedules a background retry for a set other than the currently recorded one", async () => {
      const puts = serve(({ n }) =>
        n <= 3 ? unavailable() : HttpResponse.json(confirmed("e0")),
      );
      enqueueDirectly("e0", 0);

      // Nothing calls flush() here: the hook's own background-retry effect
      // must pick up an entry left behind by a set no longer being recorded.
      renderQueue(1);
      await advanceUntil(
        () =>
          puts.length === 3 &&
          store.getState().pendingWrites.pending[0]!.nextAttemptAt !== null &&
          store.getState().pendingWrites.pending[0]!.attempts > 0,
      );
      expect(puts).toHaveLength(3);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(
          PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS[0]!,
        );
      });
      await advanceUntil(() => pendingIds().length === 0);

      expect(puts).toHaveLength(4);
    });
  });

  it("flushes entries from every pending set in one call, each against its own endpoint", async () => {
    const puts = serve(({ si }) =>
      HttpResponse.json(confirmed(si === 0 ? "e0" : "e1")),
    );
    enqueueDirectly("e0", 0);
    const { result } = renderQueue(1);
    act(() => result.current.queue.enqueue(entry("e1")));

    await act(async () => {
      await result.current.queue.flush();
    });

    expect(puts).toEqual([
      { si: 0, ids: ["e0"] },
      { si: 1, ids: ["e1"] },
    ]);
    expect(pendingIds()).toEqual([]);
  });
});

// A component reading enqueue/flush/retry through the context rather than
// calling usePendingWrites itself, standing in for each of the four real
// call sites (Game, useSubmitEntryDraft, GamePreview, SyncIndicator).
const ContextConsumer = () => {
  usePendingWritesContext();
  return null;
};

describe("PendingWritesContext: single owner", () => {
  it("fires exactly one background-retry request for one due entry, no matter how many components read the queue", async () => {
    // The request is held open: an instant answer would let a first (buggy)
    // flush clear the queue before a second instance's timer fires, hiding
    // the race this test exists to catch.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const puts = serve(async () => {
      await gate;
      return HttpResponse.json(confirmed("e1"));
    });
    enqueueDirectly("e1", 0);

    const Owner = () => {
      const pendingWrites = usePendingWrites("game-1", 0);
      return (
        <PendingWritesContext.Provider value={pendingWrites}>
          <ContextConsumer />
          <ContextConsumer />
          <ContextConsumer />
          <ContextConsumer />
        </PendingWritesContext.Provider>
      );
    };

    render(
      <Provider store={store}>
        <SwrIsolation>
          <Owner />
        </SwrIsolation>
      </Provider>,
    );

    // The entry is due immediately, so every mounted retry effect fires now.
    await waitFor(() => expect(puts).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(puts).toHaveLength(1);

    await act(async () => {
      release();
    });
    await waitFor(() => expect(pendingIds()).toEqual([]));
  });
});

describe("flush ordering", () => {
  it("keeps the confirmed entry on screen at every render between the flush and the cleared queue", async () => {
    serve(() => HttpResponse.json(confirmed("e1")));
    const seen: string[][] = [];
    const { result } = renderHook(
      () => {
        const value = {
          queue: usePendingWrites("game-1", 0),
          game: useGame("game-1"),
        };
        seen.push(value.game.game?.sets[0]?.entries.map((e) => e.id) ?? []);
        return value;
      },
      { wrapper },
    );
    await waitFor(() => expect(result.current.game.game).toBeDefined());

    act(() => result.current.queue.enqueue(entry("e1")));
    const firstRender = seen.length;
    await act(async () => {
      await result.current.queue.flush();
    });
    await waitFor(() => expect(pendingIds()).toEqual([]));

    expect(seen.slice(firstRender).every((ids) => ids.includes("e1"))).toBe(
      true,
    );
  });
});
