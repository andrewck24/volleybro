import { EntryType } from "@/entities/game";
import { act, renderHook } from "@testing-library/react";
import { HttpResponse } from "msw";
import { Provider } from "react-redux";
import { SWRConfig } from "swr";
import { useUnconfirmedSetCompletion } from "@/hooks/use-unconfirmed-set-completion";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { setCompletionActions } from "@/lib/features/game/set-completion-slice";
import type { GameView } from "@/lib/features/game/types";
import { makeStore, type AppStore } from "@/lib/redux/store";

import { gameWithSet, lastRally } from "@test/support/fixtures/finished-set";
import { answerEntries } from "@test/support/msw/entries";

let store: AppStore;
let cachedGame: GameView;

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
      entry: { type: EntryType.RALLY, id } as never,
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

beforeEach(() => {
  store = makeStore();
});

describe("useUnconfirmedSetCompletion", () => {
  it("detects a cold start with no extra persisted state: fetched win still null", () => {
    const { result } = renderUnconfirmed(null);

    expect(result.current.unconfirmed).toBe(true);
    expect(result.current.attempting).toBe(false);
  });

  it("is unconfirmed and attempting while the initial flush is in flight", () => {
    enqueue("e1", "game-1", 0);
    const { result } = renderUnconfirmed(true);

    expect(result.current.unconfirmed).toBe(true);
    expect(result.current.attempting).toBe(true);
  });

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

  it("is attempting during the background backoff window, with no flush in flight", () => {
    enqueue("e1", "game-1", 0);
    store.dispatch(
      pendingWritesActions.flushFailed({ ids: ["e1"], retryable: true }),
    );
    const { result } = renderUnconfirmed(true);

    expect(result.current.unconfirmed).toBe(true);
    expect(result.current.attempting).toBe(true);
  });

  it("stays unconfirmed, no longer attempting, once the queued entry has exhausted its backoff", () => {
    enqueue("e1", "game-1", 0);
    store.dispatch(
      pendingWritesActions.flushFailed({ ids: ["e1"], retryable: false }),
    );
    const { result } = renderUnconfirmed(true);

    expect(result.current.unconfirmed).toBe(true);
    expect(result.current.attempting).toBe(false);
  });

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
    const requests = answerEntries(() =>
      HttpResponse.json({ entries: [lastRally], setCompletionConfirmed: true }),
    );
    recordCompletion(false);
    const { result } = renderUnconfirmed(true);

    await act(async () => {
      await result.current.retry();
    });

    expect(requests).toEqual([
      {
        si: "0",
        body: [
          {
            type: EntryType.RALLY,
            id: "e1",
            seq: 0,
            at: expect.any(String),
            win: true,
            home: lastRally.home,
            away: lastRally.away,
          },
        ],
      },
    ]);
    expect(store.getState().setCompletion["game-1:0"]).toBe(true);
  });

  it("retry resends a stored entry with its recordedAt so the server sees a resend, not an edit", async () => {
    const requests = answerEntries(() =>
      HttpResponse.json({ entries: [lastRally] }),
    );
    const recordedAt = "2026-01-01T10:00:00.000Z";
    recordCompletion(false);
    cachedGame = gameWithSet(true);
    cachedGame.sets[0]!.entries = [
      { ...lastRally, recordedBy: "p1", recordedAt, editedBy: "p2" },
    ] as never;
    const { result } = renderHook(
      () => useUnconfirmedSetCompletion("game-1", 0),
      { wrapper },
    );

    await act(async () => {
      await result.current.retry();
    });

    expect(requests[0]!.body).toEqual([
      {
        type: EntryType.RALLY,
        id: "e1",
        seq: 0,
        at: recordedAt,
        win: true,
        home: lastRally.home,
        away: lastRally.away,
      },
    ]);
  });

  it("retry resends an optimistic entry with its own at, not a fresh one", async () => {
    const requests = answerEntries(() =>
      HttpResponse.json({ entries: [lastRally] }),
    );
    const at = "2026-01-01T10:00:00.000Z";
    recordCompletion(false);
    cachedGame = gameWithSet(true);
    cachedGame.sets[0]!.entries = [{ ...lastRally, at }] as never;
    const { result } = renderHook(
      () => useUnconfirmedSetCompletion("game-1", 0),
      { wrapper },
    );

    await act(async () => {
      await result.current.retry();
    });

    expect(requests[0]!.body).toEqual([
      {
        type: EntryType.RALLY,
        id: "e1",
        seq: 0,
        at,
        win: true,
        home: lastRally.home,
        away: lastRally.away,
      },
    ]);
  });

  it("closes after a successful retry even though the entry is still queued and the response omits the field", async () => {
    answerEntries(() => HttpResponse.json({ entries: [lastRally] }));
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
    expect(store.getState().pendingWrites.pending).toHaveLength(0);
  });

  it("retry leaves the session signal untouched on failure", async () => {
    answerEntries(() =>
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
