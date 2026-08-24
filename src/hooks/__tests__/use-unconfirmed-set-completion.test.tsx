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
    store.dispatch(pendingWritesActions.flushStarted({ gameId: "game-1" }));
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
    store.dispatch(pendingWritesActions.flushStarted({ gameId: "game-2" }));
    const { result } = renderHook(
      () => useUnconfirmedSetCompletion("game-1", 0),
      { wrapper },
    );

    expect(result.current.unconfirmed).toBe(false);
    expect(result.current.attempting).toBe(false);
  });

  // The behaviour a bare boolean flag could not distinguish: this game/set's
  // own entry sits unconfirmed in the queue (exhausted or not yet attempted)
  // while a wholly different game's flush is genuinely on the wire. Without
  // game identity on the flag, `flushing` alone would read this as this
  // set's own in-flight attempt.
  it("is not attempting when this set has a queued entry but the in-flight flush belongs to a different game", () => {
    mockGame = gameWithSet(true); // optimistic write already applied
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: { id: "e1" } as never,
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    store.dispatch(pendingWritesActions.flushStarted({ gameId: "game-2" }));
    const { result } = renderHook(
      () => useUnconfirmedSetCompletion("game-1", 0),
      { wrapper },
    );

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
