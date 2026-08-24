import { SyncIndicator } from "@/components/game/header/sync-indicator";
import * as apiClientModule from "@/lib/api/api-client";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import type { PendingEntry } from "@/lib/features/game/types";
import { makeStore, type AppStore } from "@/lib/redux/store";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";

jest.mock("@/lib/api/api-client", () => ({
  ...jest.requireActual("@/lib/api/api-client"),
  apiClient: jest.fn(),
}));

const apiClient = apiClientModule.apiClient as jest.Mock;

jest.mock("@/hooks/use-data", () => ({
  useGame: () => ({ game: undefined, mutate: jest.fn() }),
}));

const entry = (id: string) =>
  ({ id, seq: 0, win: true, home: {}, away: {} }) as PendingEntry["entry"];

let store: AppStore;
const renderIndicator = (onSurroundingClick: () => void) => {
  store = makeStore();
  return render(
    <Provider store={store}>
      <div onClick={onSurroundingClick}>
        <SyncIndicator gameId="game-1" />
      </div>
    </Provider>,
  );
};

afterEach(() => {
  // Not resetAllMocks: that would also wipe the shared jsdom
  // ResizeObserver/IntersectionObserver mocks Radix's Popper needs, since
  // they're jest.fn() too.
  apiClient.mockReset();
});

describe("SyncIndicator", () => {
  it("shows synced when the queue is empty", () => {
    renderIndicator(jest.fn());

    expect(screen.getByRole("button", { name: "已同步" })).toBeInTheDocument();
  });

  it("shows syncing while an item still has a scheduled attempt", () => {
    store = makeStore();
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    render(
      <Provider store={store}>
        <SyncIndicator gameId="game-1" />
      </Provider>,
    );

    expect(screen.getByRole("button", { name: "同步中" })).toBeInTheDocument();
  });

  it("shows the unsynced count once an item's backoff is exhausted", () => {
    store = makeStore();
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    store.dispatch(
      pendingWritesActions.flushFailed({ ids: ["e1"], retryable: false }),
    );
    render(
      <Provider store={store}>
        <SyncIndicator gameId="game-1" />
      </Provider>,
    );

    expect(
      screen.getByRole("button", { name: "1 筆未同步" }),
    ).toBeInTheDocument();
  });

  it("ignores pending entries that belong to a different game", () => {
    store = makeStore();
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "other-game",
        setIndex: 0,
      }),
    );
    render(
      <Provider store={store}>
        <SyncIndicator gameId="game-1" />
      </Provider>,
    );

    expect(screen.getByRole("button", { name: "已同步" })).toBeInTheDocument();
  });

  it("does not open the surrounding block's overview on tap", async () => {
    const onSurroundingClick = jest.fn();
    const user = userEvent.setup();
    renderIndicator(onSurroundingClick);

    await user.click(screen.getByRole("button", { name: "已同步" }));

    expect(onSurroundingClick).not.toHaveBeenCalled();
  });

  it("retry closes the popover, flushes the queue, and moves to syncing", async () => {
    apiClient.mockResolvedValue({ entries: [{ id: "e1" }] });
    store = makeStore();
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    store.dispatch(
      pendingWritesActions.flushFailed({ ids: ["e1"], retryable: false }),
    );
    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <SyncIndicator gameId="game-1" />
      </Provider>,
    );

    await user.click(screen.getByRole("button", { name: "1 筆未同步" }));
    const retryButton = await screen.findByRole("button", { name: "重試" });
    await user.click(retryButton);

    expect(
      screen.queryByRole("button", { name: "重試" }),
    ).not.toBeInTheDocument();
    expect(apiClient).toHaveBeenCalled();
  });
  // The reason this slice exists: an entry left over from a set the
  // recorder has moved past must be part of both the count SyncIndicator
  // shows and the set retry can actually clear -- never a number the
  // recorder has no way to act on.
  it("counts and clears entries from every pending set of this game, not just the current one", async () => {
    apiClient.mockImplementation(async (url: string) =>
      url.includes("si=0")
        ? { entries: [{ id: "e0" }] }
        : { entries: [{ id: "e1" }] },
    );
    store = makeStore();
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e0"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    store.dispatch(
      pendingWritesActions.flushFailed({ ids: ["e0"], retryable: false }),
    );
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 1,
      }),
    );
    store.dispatch(
      pendingWritesActions.flushFailed({ ids: ["e1"], retryable: false }),
    );
    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <SyncIndicator gameId="game-1" />
      </Provider>,
    );

    // The badge counts both sets' failures, not just the current set (0).
    await user.click(screen.getByRole("button", { name: "2 筆未同步" }));
    const retryButton = await screen.findByRole("button", { name: "重試" });
    await user.click(retryButton);

    // Retry actually reached both sets' endpoints and cleared both entries.
    expect(apiClient).toHaveBeenCalledTimes(2);
    expect(apiClient).toHaveBeenCalledWith(
      expect.stringContaining("si=0"),
      expect.anything(),
    );
    expect(apiClient).toHaveBeenCalledWith(
      expect.stringContaining("si=1"),
      expect.anything(),
    );
    expect(store.getState().pendingWrites.pending).toHaveLength(0);
  });
});
