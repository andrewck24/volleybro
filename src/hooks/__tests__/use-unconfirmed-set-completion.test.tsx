import { act, renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { useUnconfirmedSetCompletion } from "@/hooks/use-unconfirmed-set-completion";
import { ApiClientError } from "@/lib/api/api-client";
import * as apiClientModule from "@/lib/api/api-client";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { setCompletionActions } from "@/lib/features/game/set-completion-slice";
import type { GameView } from "@/lib/features/game/types";
import { makeStore, type AppStore } from "@/lib/redux/store";

jest.mock("@/lib/api/api-client", () => ({
  ...jest.requireActual("@/lib/api/api-client"),
  apiClient: jest.fn(),
}));

const apiClient = apiClientModule.apiClient as jest.Mock;

const mutate = jest.fn();
let mockGame: GameView | undefined;
jest.mock("@/hooks/use-data", () => ({
  useGame: () => ({ game: mockGame, mutate }),
}));

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
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>{children}</Provider>
);

beforeEach(() => {
  store = makeStore();
  mockGame = undefined;
  mutate.mockClear();
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("useUnconfirmedSetCompletion", () => {
  it("is not unconfirmed when the set is still in progress (win null, no session signal, nothing in flight)", () => {
    mockGame = gameWithSet(null);
    const { result } = renderHook(
      () => useUnconfirmedSetCompletion("game-1", 0),
      { wrapper },
    );

    // Cold start alone cannot distinguish "still in progress" from "never
    // confirmed" -- callers only invoke this once Interval has already
    // established the set is over. Absent that gate, win===null plus no
    // session signal reads as unconfirmed by this hook's own rule.
    expect(result.current.unconfirmed).toBe(true);
    expect(result.current.attempting).toBe(false);
  });

  it("is unconfirmed and attempting while the initial flush is in flight", () => {
    mockGame = gameWithSet(true); // optimistic write already applied
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: { id: "e1" } as never,
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    const { result } = renderHook(
      () => useUnconfirmedSetCompletion("game-1", 0),
      { wrapper },
    );

    expect(result.current.unconfirmed).toBe(true);
    expect(result.current.attempting).toBe(true);
  });

  it("is not unconfirmed when a flush for an unrelated game/set is in flight", () => {
    // Regression: a flush triggered by an entry belonging to a different
    // set must not raise the unconfirmed dialog over a set whose result
    // already landed.
    mockGame = gameWithSet(true); // stored result already landed correctly
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: { id: "other" } as never,
        gameId: "game-2",
        setIndex: 3,
      }),
    );
    const { result } = renderHook(
      () => useUnconfirmedSetCompletion("game-1", 0),
      { wrapper },
    );

    expect(result.current.unconfirmed).toBe(false);
    expect(result.current.attempting).toBe(false);
  });

  // Defect regression: a scheduled background-retry attempt must read as
  // attempting even with no request literally on the wire, or the dialog
  // disappears for the whole backoff window between the failed attempt and
  // the next flush -- exactly the flicker this hook must not reproduce.
  it("is attempting during the background backoff window, with no flush in flight", () => {
    mockGame = gameWithSet(true); // optimistic write already applied
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: { id: "e1" } as never,
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    // A retryable failure schedules nextAttemptAt in the future, so this
    // window has no request on the wire at all.
    store.dispatch(
      pendingWritesActions.flushFailed({
        ids: ["e1"],
        retryable: true,
      }),
    );

    const { result } = renderHook(
      () => useUnconfirmedSetCompletion("game-1", 0),
      { wrapper },
    );

    expect(result.current.unconfirmed).toBe(true);
    expect(result.current.attempting).toBe(true);
  });

  // The whole point of this dialog is that the next set cannot start on a
  // result that was never saved. Once the retry budget runs out the entry
  // stops being "attempting", and the optimistic write has already put
  // `win` on the cached set -- so if the queue is not consulted, every
  // signal says confirmed and the dialog closes over an unsent result.
  it("stays unconfirmed, no longer attempting, once the queued entry has exhausted its backoff", () => {
    mockGame = gameWithSet(true); // optimistic write already applied
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: { id: "e1" } as never,
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    // retryable: false spends the budget outright -- nextAttemptAt becomes
    // null and nothing will send this entry again without a manual retry.
    store.dispatch(
      pendingWritesActions.flushFailed({
        ids: ["e1"],
        retryable: false,
      }),
    );

    const { result } = renderHook(
      () => useUnconfirmedSetCompletion("game-1", 0),
      { wrapper },
    );

    expect(result.current.unconfirmed).toBe(true);
    expect(result.current.attempting).toBe(false);
  });

  // The queue term must not outlive its purpose: once the flush lands, the
  // entry leaves the queue and the dialog has nothing left to cover.
  it("closes once the flush succeeds and the entry leaves the queue", () => {
    mockGame = gameWithSet(true);
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: { id: "e1" } as never,
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    store.dispatch(pendingWritesActions.flushSucceeded({ ids: ["e1"] }));
    store.dispatch(
      setCompletionActions.recorded({
        gameId: "game-1",
        setIndex: 0,
        confirmed: true,
      }),
    );

    const { result } = renderHook(
      () => useUnconfirmedSetCompletion("game-1", 0),
      { wrapper },
    );

    expect(result.current.unconfirmed).toBe(false);
  });

  // The set-dimension counterpart of the game-scoping test above: a flush
  // covers every pending set of one game, so game identity alone is not
  // enough -- an entry queued for a different set of this same game must
  // not be read as this set's own attempt.
  it("is not attempting when the queued entry belongs to a different set of the same game", () => {
    mockGame = gameWithSet(true); // optimistic write already applied
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: { id: "other" } as never,
        gameId: "game-1",
        setIndex: 5,
      }),
    );
    const { result } = renderHook(
      () => useUnconfirmedSetCompletion("game-1", 0),
      { wrapper },
    );

    expect(result.current.unconfirmed).toBe(false);
    expect(result.current.attempting).toBe(false);
  });

  it("is hidden once the session signal confirms the set result", () => {
    mockGame = gameWithSet(true);
    store.dispatch(
      setCompletionActions.recorded({
        gameId: "game-1",
        setIndex: 0,
        confirmed: true,
      }),
    );
    const { result } = renderHook(
      () => useUnconfirmedSetCompletion("game-1", 0),
      { wrapper },
    );

    expect(result.current.unconfirmed).toBe(false);
  });

  it("shows the exhausted state (not attempting) once the session signal reports failure", () => {
    mockGame = gameWithSet(true);
    store.dispatch(
      setCompletionActions.recorded({
        gameId: "game-1",
        setIndex: 0,
        confirmed: false,
      }),
    );
    const { result } = renderHook(
      () => useUnconfirmedSetCompletion("game-1", 0),
      { wrapper },
    );

    expect(result.current.unconfirmed).toBe(true);
    expect(result.current.attempting).toBe(false);
  });

  it("detects a cold start with no extra persisted state: fetched win still null after entries imply the set is over", () => {
    mockGame = gameWithSet(null);
    const { result } = renderHook(
      () => useUnconfirmedSetCompletion("game-1", 0),
      { wrapper },
    );

    expect(result.current.unconfirmed).toBe(true);
    expect(result.current.attempting).toBe(false);
  });

  it("retry resends the last rally entry and records success", async () => {
    mockGame = gameWithSet(true);
    apiClient.mockResolvedValue({
      entries: [lastRally],
      setCompletionConfirmed: true,
    });
    store.dispatch(
      setCompletionActions.recorded({
        gameId: "game-1",
        setIndex: 0,
        confirmed: false,
      }),
    );
    const { result } = renderHook(
      () => useUnconfirmedSetCompletion("game-1", 0),
      { wrapper },
    );

    await act(async () => {
      await result.current.retry();
    });

    expect(apiClient).toHaveBeenCalledWith(
      expect.stringContaining("si=0"),
      expect.objectContaining({
        body: JSON.stringify([
          {
            id: "e1",
            seq: 0,
            win: true,
            home: lastRally.home,
            away: lastRally.away,
          },
        ]),
      }),
    );
    expect(store.getState().setCompletion["game-1:0"]).toBe(true);
  });

  // The manual retry bypasses the queue -- it sends the entry itself rather
  // than going through flush -- so nothing removes the entry from the queue
  // on its way out. If the dialog consults the queue, a successful retry
  // must still close it.
  it("closes after a successful retry even though the entry is still queued", async () => {
    mockGame = gameWithSet(true);
    apiClient.mockResolvedValue({ entries: [lastRally] });
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: { id: "e1" } as never,
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    store.dispatch(
      pendingWritesActions.flushFailed({
        ids: ["e1"],
        retryable: false,
      }),
    );

    const { result } = renderHook(
      () => useUnconfirmedSetCompletion("game-1", 0),
      { wrapper },
    );
    expect(result.current.unconfirmed).toBe(true);

    await act(async () => {
      await result.current.retry();
    });

    expect(store.getState().setCompletion["game-1:0"]).toBe(true);
    expect(result.current.unconfirmed).toBe(false);
    // Nothing else takes the entry out: an entry left behind would keep the
    // sync indicator reporting it unsent for the rest of the session.
    expect(store.getState().pendingWrites.pending).toHaveLength(0);
  });

  it("retry defaults to confirmed when the response omits the field", async () => {
    mockGame = gameWithSet(true);
    apiClient.mockResolvedValue({ entries: [lastRally] });
    store.dispatch(
      setCompletionActions.recorded({
        gameId: "game-1",
        setIndex: 0,
        confirmed: false,
      }),
    );
    const { result } = renderHook(
      () => useUnconfirmedSetCompletion("game-1", 0),
      { wrapper },
    );

    await act(async () => {
      await result.current.retry();
    });

    expect(store.getState().setCompletion["game-1:0"]).toBe(true);
  });

  it("retry leaves the session signal untouched on failure", async () => {
    mockGame = gameWithSet(true);
    apiClient.mockRejectedValue(
      new ApiClientError("invalid", {
        code: "VALIDATION",
        reason: "INVALID_INPUT",
        detail: "invalid",
        status: 400,
      }),
    );
    store.dispatch(
      setCompletionActions.recorded({
        gameId: "game-1",
        setIndex: 0,
        confirmed: false,
      }),
    );
    const { result } = renderHook(
      () => useUnconfirmedSetCompletion("game-1", 0),
      { wrapper },
    );

    await act(async () => {
      await result.current.retry();
    });

    expect(store.getState().setCompletion["game-1:0"]).toBe(false);
  });
});
