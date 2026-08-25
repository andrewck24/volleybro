import { act, render, renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import {
  PendingWritesProvider,
  usePendingWrites,
  usePendingWritesContext,
} from "@/hooks/use-pending-writes";
import { ApiClientError } from "@/lib/api/api-client";
import * as apiClientModule from "@/lib/api/api-client";
import {
  PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS,
  PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS,
} from "@/lib/features/game/pending-writes";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import type { PendingEntry } from "@/lib/features/game/types";
import { makeStore, type AppStore } from "@/lib/redux/store";

jest.mock("@/lib/api/api-client", () => ({
  ...jest.requireActual("@/lib/api/api-client"),
  apiClient: jest.fn(),
}));

const apiClient = apiClientModule.apiClient as jest.Mock;

const mutate = jest.fn();
jest.mock("@/hooks/use-data", () => ({
  useGame: () => ({ game: undefined, mutate }),
}));

const entry = (id: string) =>
  ({ id, seq: 0, win: true, home: {}, away: {} }) as PendingEntry["entry"];

const networkError = () =>
  new ApiClientError("network down", {
    code: "TRANSIENT",
    reason: "NETWORK_ERROR",
    detail: "network down",
    status: 503,
  });

let store: AppStore;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>{children}</Provider>
);

beforeEach(() => {
  store = makeStore();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.resetAllMocks();
});

describe("usePendingWrites", () => {
  it("enqueue + flush sends the entry once and removes it from the queue on success", async () => {
    apiClient.mockResolvedValue({ entries: [{ id: "e1" }] });
    const { result } = renderHook(() => usePendingWrites("game-1", 0), {
      wrapper,
    });

    act(() => result.current.enqueue(entry("e1")));
    await act(async () => {
      await result.current.flush();
    });

    expect(apiClient).toHaveBeenCalledTimes(1);
    expect(store.getState().pendingWrites.pending).toHaveLength(0);
    expect(mutate).toHaveBeenCalled();
  });

  it("records the set-completion result from the response when the field is present", async () => {
    apiClient.mockResolvedValue({
      entries: [{ id: "e1" }],
      setCompletionConfirmed: false,
    });
    const { result } = renderHook(() => usePendingWrites("game-1", 0), {
      wrapper,
    });

    act(() => result.current.enqueue(entry("e1")));
    await act(async () => {
      await result.current.flush();
    });

    expect(store.getState().setCompletion["game-1:0"]).toBe(false);
  });

  it("leaves the set-completion result untouched when the field is absent", async () => {
    apiClient.mockResolvedValue({ entries: [{ id: "e1" }] });
    const { result } = renderHook(() => usePendingWrites("game-1", 0), {
      wrapper,
    });

    act(() => result.current.enqueue(entry("e1")));
    await act(async () => {
      await result.current.flush();
    });

    expect(store.getState().setCompletion["game-1:0"]).toBeUndefined();
  });

  it("dedupes concurrent flush calls into a single in-flight request", async () => {
    let resolveRequest!: (v: unknown) => void;
    apiClient.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const { result } = renderHook(() => usePendingWrites("game-1", 0), {
      wrapper,
    });

    act(() => result.current.enqueue(entry("e1")));

    let first!: Promise<unknown>;
    let second!: Promise<unknown>;
    act(() => {
      first = result.current.flush();
      second = result.current.flush();
    });

    expect(apiClient).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveRequest({ entries: [{ id: "e1" }] });
      await Promise.all([first, second]);
    });
  });

  it("schedules a background retry after a retryable failure and eventually writes once", async () => {
    apiClient
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce({ entries: [{ id: "e1" }] });
    const { result } = renderHook(() => usePendingWrites("game-1", 0), {
      wrapper,
    });

    act(() => result.current.enqueue(entry("e1")));
    await act(async () => {
      const promise = result.current.flush();
      for (const delay of PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS) {
        await jest.advanceTimersByTimeAsync(delay);
      }
      await promise;
    });

    // Inline retries exhausted (3 calls); item now waits on the background
    // schedule -- advance to the first background delay and let the
    // effect-driven retry fire.
    expect(apiClient).toHaveBeenCalledTimes(3);
    expect(store.getState().pendingWrites.pending[0]!.nextAttemptAt).not.toBe(
      null,
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS[0]!,
      );
    });

    expect(apiClient).toHaveBeenCalledTimes(4);
    expect(store.getState().pendingWrites.pending).toHaveLength(0);
  });

  it("flushes an entry queued while offline exactly once when connectivity returns", async () => {
    apiClient
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce({ entries: [{ id: "e1" }] });
    const { result } = renderHook(() => usePendingWrites("game-1", 0), {
      wrapper,
    });

    act(() => result.current.enqueue(entry("e1")));
    await act(async () => {
      const promise = result.current.flush();
      for (const delay of PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS) {
        await jest.advanceTimersByTimeAsync(delay);
      }
      await promise;
    });
    expect(apiClient).toHaveBeenCalledTimes(3);
    expect(store.getState().pendingWrites.pending).toHaveLength(1);

    await act(async () => {
      window.dispatchEvent(new Event("online"));
      // The online listener's flush is already in flight by now; flush()
      // dedupes to the same promise, so awaiting it waits for that request.
      await result.current.flush();
    });

    expect(apiClient).toHaveBeenCalledTimes(4);
    expect(store.getState().pendingWrites.pending).toHaveLength(0);
  });

  // The recorder can start set N+1 while set N still has an unconfirmed
  // entry -- the queue must not orphan it (defect closed by this slice).
  it("flushes entries left behind by a previous set when instantiated with the new set index", async () => {
    apiClient.mockResolvedValue({ entries: [{ id: "e0" }] });
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e0"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );

    const { result } = renderHook(() => usePendingWrites("game-1", 1), {
      wrapper,
    });

    await act(async () => {
      await result.current.flush();
    });

    expect(apiClient).toHaveBeenCalledWith(
      expect.stringContaining("si=0"),
      expect.anything(),
    );
    expect(store.getState().pendingWrites.pending).toHaveLength(0);
  });

  it("flushes entries from every pending set in one call, each against its own endpoint", async () => {
    apiClient.mockImplementation(async (url: string) =>
      url.includes("si=0")
        ? { entries: [{ id: "e0" }] }
        : { entries: [{ id: "e1" }] },
    );
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e0"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    const { result } = renderHook(() => usePendingWrites("game-1", 1), {
      wrapper,
    });
    act(() => result.current.enqueue(entry("e1")));

    await act(async () => {
      await result.current.flush();
    });

    expect(apiClient).toHaveBeenCalledTimes(2);
    expect(store.getState().pendingWrites.pending).toHaveLength(0);
  });

  it("still schedules a background retry for a set other than the currently recorded one", async () => {
    apiClient
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce({ entries: [{ id: "e0" }] });
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e0"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );

    renderHook(() => usePendingWrites("game-1", 1), { wrapper });

    // Nothing calls flush() directly here -- the hook's own background-retry
    // effect must pick up an entry left behind by a set that is no longer
    // the one being recorded.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
      for (const delay of PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS) {
        await jest.advanceTimersByTimeAsync(delay);
      }
    });

    expect(apiClient).toHaveBeenCalledTimes(3);
    expect(store.getState().pendingWrites.pending[0]!.nextAttemptAt).not.toBe(
      null,
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS[0]!,
      );
    });

    expect(apiClient).toHaveBeenCalledTimes(4);
    expect(store.getState().pendingWrites.pending).toHaveLength(0);
  });
});

// A component reading enqueue/flush/retry through the context rather than
// calling usePendingWrites itself, standing in for each of the four real
// call sites (Game, useSubmitEntryDraft, GamePreview, SyncIndicator).
const ContextConsumer = () => {
  usePendingWritesContext();
  return null;
};

describe("PendingWritesProvider: single owner", () => {
  it("fires exactly one background-retry request for one due entry, no matter how many components read the queue", async () => {
    // The request is held open deliberately: a mock that resolves
    // instantly would let a first (buggy) flush finish and clear the queue
    // before a second instance's timer even fires, hiding the very race
    // this test exists to catch. Holding it open keeps the entry visibly
    // "still pending" while every due timer fires, the way a real network
    // request (which takes real time) would.
    let resolveRequest!: (v: unknown) => void;
    apiClient.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );

    const Owner = () => {
      const pendingWrites = usePendingWrites("game-1", 0);
      return (
        <PendingWritesProvider value={pendingWrites}>
          {/* Four consumers, mirroring the four real call sites that used to
              each mount their own usePendingWrites instance. */}
          <ContextConsumer />
          <ContextConsumer />
          <ContextConsumer />
          <ContextConsumer />
        </PendingWritesProvider>
      );
    };

    render(
      <Provider store={store}>
        <Owner />
      </Provider>,
    );

    // The entry is due immediately (enqueued's nextAttemptAt is Date.now()),
    // so every mounted background-retry effect fires on this tick.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });

    expect(apiClient).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRequest({ entries: [{ id: "e1" }] });
    });
    expect(store.getState().pendingWrites.pending).toHaveLength(0);
  });
});
