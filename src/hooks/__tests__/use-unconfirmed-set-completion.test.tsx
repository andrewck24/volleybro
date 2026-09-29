import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Provider } from "react-redux";
import { SWRConfig } from "swr";
import { useUnconfirmedSetCompletion } from "@/hooks/use-unconfirmed-set-completion";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { setCompletionActions } from "@/lib/features/game/set-completion-slice";
import type { GameView } from "@/lib/features/game/types";
import { makeStore, type AppStore } from "@/lib/redux/store";

import { server } from "../../../test/msw/server";

const lastRally = {
  type: "Rally",
  id: "e1",
  seq: 0,
  win: true,
  home: { score: 25, type: 2, num: 0 },
  away: { score: 20, type: 2, num: 0 },
};

const gameWithSet = (win: boolean | null): GameView =>
  ({
    id: "game-1",
    sets: [{ win, entries: [lastRally] }],
  }) as never;

let store: AppStore;
let cachedGame: GameView;
// The game is seeded into the SWR cache: this hook reads it, and what the
// tests vary is the game's stored result, not how it is fetched.
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <SWRConfig
      value={{
        provider: () =>
          new Map([["/api/games/game-1", { data: cachedGame }]]) as never,
      }}
    >
      {children}
    </SWRConfig>
  </Provider>
);

const renderUnconfirmed = (win: boolean | null) => {
  cachedGame = gameWithSet(win);
  return renderHook(() => useUnconfirmedSetCompletion("game-1", 0), {
    wrapper,
  });
};

const enqueue = (id: string, gameId: string, setIndex: number) =>
  store.dispatch(
    pendingWritesActions.enqueued({
      entry: { id } as never,
      gameId,
      setIndex,
    }),
  );

const recordCompletion = (confirmed: boolean) =>
  store.dispatch(
    setCompletionActions.recorded({
      gameId: "game-1",
      setIndex: 0,
      confirmed,
    }),
  );

/** Answers the rally endpoint and records the body of each PUT. */
const serveRallies = (respond: () => Response) => {
  const bodies: unknown[] = [];
  server.use(
    http.put("/api/games/game-1/sets/rallies", async ({ request }) => {
      expect(new URL(request.url).searchParams.get("si")).toBe("0");
      bodies.push(await request.json());
      return respond();
    }),
  );
  return bodies;
};

beforeEach(() => {
  store = makeStore();
});

describe("useUnconfirmedSetCompletion", () => {
  // Callers only invoke this once Interval has established the set is over,
  // so a fetched win still null with no session signal is a set whose result
  // was never saved.
  it("detects a cold start with no extra persisted state: fetched win still null", () => {
    const { result } = renderUnconfirmed(null);

    expect(result.current.unconfirmed).toBe(true);
    expect(result.current.attempting).toBe(false);
  });

  it("is unconfirmed and attempting while the initial flush is in flight", () => {
    enqueue("e1", "game-1", 0);
    const { result } = renderUnconfirmed(true); // optimistic write already applied

    expect(result.current.unconfirmed).toBe(true);
    expect(result.current.attempting).toBe(true);
  });

  // A flush covers every pending set of one game, so game identity alone is
  // not enough: an entry queued for another game, or for a different set of
  // this game, must not read as this set's attempt and raise the dialog over
  // a set whose result already landed.
  it.each([
    ["a different game", "game-2", 3],
    ["a different set of the same game", "game-1", 5],
  ])(
    "is not unconfirmed when the queued entry belongs to %s",
    (_name, gameId, setIndex) => {
      enqueue("other", gameId, setIndex);
      const { result } = renderUnconfirmed(true);

      expect(result.current.unconfirmed).toBe(false);
      expect(result.current.attempting).toBe(false);
    },
  );

  // A scheduled background-retry attempt must read as attempting even with no
  // request on the wire, or the dialog disappears for the whole backoff
  // window between a failed attempt and the next flush.
  it("is attempting during the background backoff window, with no flush in flight", () => {
    enqueue("e1", "game-1", 0);
    store.dispatch(
      pendingWritesActions.flushFailed({ ids: ["e1"], retryable: true }),
    );
    const { result } = renderUnconfirmed(true);

    expect(result.current.unconfirmed).toBe(true);
    expect(result.current.attempting).toBe(true);
  });

  // The optimistic write has already put `win` on the cached set, so once the
  // retry budget runs out the queue is the only evidence the result was never
  // saved; without it every signal says confirmed over an unsent result.
  it("stays unconfirmed, no longer attempting, once the queued entry has exhausted its backoff", () => {
    enqueue("e1", "game-1", 0);
    // retryable: false spends the budget outright: nothing will send this
    // entry again without a manual retry.
    store.dispatch(
      pendingWritesActions.flushFailed({ ids: ["e1"], retryable: false }),
    );
    const { result } = renderUnconfirmed(true);

    expect(result.current.unconfirmed).toBe(true);
    expect(result.current.attempting).toBe(false);
  });

  // The queue term must not outlive its purpose: once a flush lands without
  // reporting a completion result, the entry has left the queue and the
  // dialog has nothing left to cover.
  it("closes once the flush succeeds and the entry leaves the queue", () => {
    enqueue("e1", "game-1", 0);
    store.dispatch(pendingWritesActions.flushSucceeded({ ids: ["e1"] }));
    const { result } = renderUnconfirmed(true);

    expect(result.current.unconfirmed).toBe(false);
  });

  it("is hidden once the session signal confirms the set result", () => {
    recordCompletion(true);
    const { result } = renderUnconfirmed(true);

    expect(result.current.unconfirmed).toBe(false);
  });

  it("shows the exhausted state (not attempting) once the session signal reports failure", () => {
    recordCompletion(false);
    const { result } = renderUnconfirmed(true);

    expect(result.current.unconfirmed).toBe(true);
    expect(result.current.attempting).toBe(false);
  });

  it("retry resends the last rally entry and records success", async () => {
    const bodies = serveRallies(() =>
      HttpResponse.json({ entries: [lastRally], setCompletionConfirmed: true }),
    );
    recordCompletion(false);
    const { result } = renderUnconfirmed(true);

    await act(async () => {
      await result.current.retry();
    });

    expect(bodies).toEqual([
      [
        {
          id: "e1",
          seq: 0,
          win: true,
          home: lastRally.home,
          away: lastRally.away,
        },
      ],
    ]);
    expect(store.getState().setCompletion["game-1:0"]).toBe(true);
  });

  // The manual retry bypasses the queue: it sends the entry itself, so
  // nothing removes the entry on its way out. A successful retry must still
  // close the dialog, and a response that omits the field means a different
  // attempt already matched the derived result, which is a confirmation.
  it("closes after a successful retry even though the entry is still queued and the response omits the field", async () => {
    serveRallies(() => HttpResponse.json({ entries: [lastRally] }));
    enqueue("e1", "game-1", 0);
    store.dispatch(
      pendingWritesActions.flushFailed({ ids: ["e1"], retryable: false }),
    );
    const { result } = renderUnconfirmed(true);
    expect(result.current.unconfirmed).toBe(true);

    await act(async () => {
      await result.current.retry();
    });

    expect(store.getState().setCompletion["game-1:0"]).toBe(true);
    expect(result.current.unconfirmed).toBe(false);
    // An entry left behind would keep the sync indicator reporting it unsent
    // for the rest of the session.
    expect(store.getState().pendingWrites.pending).toHaveLength(0);
  });

  it("retry leaves the session signal untouched on failure", async () => {
    serveRallies(() =>
      HttpResponse.json(
        { code: "VALIDATION", reason: "INVALID_INPUT" },
        { status: 400 },
      ),
    );
    recordCompletion(false);
    const { result } = renderUnconfirmed(true);

    await act(async () => {
      await result.current.retry();
    });

    expect(store.getState().setCompletion["game-1:0"]).toBe(false);
  });
});
