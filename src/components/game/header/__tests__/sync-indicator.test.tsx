import {
  SYNCED_ACK_MS,
  SyncIndicator,
} from "@/components/game/header/sync-indicator";
import {
  PendingWritesProvider,
  usePendingWrites,
} from "@/hooks/use-pending-writes";
import * as apiClientModule from "@/lib/api/api-client";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import type { PendingEntry } from "@/lib/features/game/types";
import { makeStore, type AppStore } from "@/lib/redux/store";
import { act, render, screen } from "@testing-library/react";
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

// SyncIndicator reads enqueue/flush/retry from context now that
// `usePendingWrites` mounts once in `Game` -- this harness stands in for
// that single owner so SyncIndicator can still be rendered on its own here.
const PendingWritesTestHarness = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const pendingWrites = usePendingWrites("game-1", 0);
  return (
    <PendingWritesProvider value={pendingWrites}>
      {children}
    </PendingWritesProvider>
  );
};

let store: AppStore;
const renderIndicator = (onSurroundingClick: () => void) => {
  store = makeStore();
  return render(
    <Provider store={store}>
      <PendingWritesTestHarness>
        <div onClick={onSurroundingClick}>
          <SyncIndicator gameId="game-1" />
        </div>
      </PendingWritesTestHarness>
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
  it("renders no control at all when the queue is empty, but keeps the slot's size", () => {
    renderIndicator(jest.fn());

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    // The middle column centres its children, so a slot that collapsed
    // would drag the volleyball mark up and down as writes come and go.
    expect(screen.getByTestId("sync-indicator-slot")).toHaveClass("size-6");
  });

  it("shows the count while syncing, wearing the syncing style", () => {
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
        <PendingWritesTestHarness>
          <SyncIndicator gameId="game-1" />
        </PendingWritesTestHarness>
      </Provider>,
    );

    const button = screen.getByRole("button", { name: "1 筆未同步" });
    expect(button).toBeInTheDocument();
    // Syncing style, not the unsynced (warning ring) style.
    expect(button).not.toHaveClass("ring-warning/30");
  });

  it("shows the unsynced count once an item's backoff is exhausted, with the retry control visible", async () => {
    store = makeStore();
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    store.dispatch(
      pendingWritesActions.flushFailed({
        gameId: "game-1",
        ids: ["e1"],
        retryable: false,
      }),
    );
    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <PendingWritesTestHarness>
          <SyncIndicator gameId="game-1" />
        </PendingWritesTestHarness>
      </Provider>,
    );

    const button = screen.getByRole("button", { name: "1 筆未同步" });
    expect(button).toHaveClass("ring-warning/30");

    await user.click(button);

    expect(
      await screen.findByRole("button", { name: "重試" }),
    ).toBeInTheDocument();
    // The popover's own icon carries the warning color explicitly (it
    // doesn't inherit it from the trigger button, which is a different
    // element in the portalled popover content).
    expect(screen.getByTestId("sync-popover-icon")).toHaveClass("text-warning");
  });

  it("reads as unsynced, retry control visible, when this game's queue is exhausted and a different game's flush is in flight", () => {
    store = makeStore();
    // This game's item has exhausted its backoff...
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    store.dispatch(
      pendingWritesActions.flushFailed({
        gameId: "game-1",
        ids: ["e1"],
        retryable: false,
      }),
    );
    // ...and, at the same time, an unrelated game's flush is genuinely in
    // flight. The flag now carries its own game identity, so this must not
    // be read as this game's syncing state.
    store.dispatch(pendingWritesActions.flushStarted({ gameId: "other-game" }));
    render(
      <Provider store={store}>
        <PendingWritesTestHarness>
          <SyncIndicator gameId="game-1" />
        </PendingWritesTestHarness>
      </Provider>,
    );

    const button = screen.getByRole("button", { name: "1 筆未同步" });
    expect(button).toHaveClass("ring-warning/30");
  });

  it("ignores pending entries -- and an in-flight flush -- that belong to a different game", () => {
    store = makeStore();
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "other-game",
        setIndex: 0,
      }),
    );
    store.dispatch(pendingWritesActions.flushStarted({ gameId: "other-game" }));
    render(
      <Provider store={store}>
        <PendingWritesTestHarness>
          <SyncIndicator gameId="game-1" />
        </PendingWritesTestHarness>
      </Provider>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not open the surrounding block's overview on tap", async () => {
    const onSurroundingClick = jest.fn();
    store = makeStore();
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    store.dispatch(
      pendingWritesActions.flushFailed({
        gameId: "game-1",
        ids: ["e1"],
        retryable: false,
      }),
    );
    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <PendingWritesTestHarness>
          <div onClick={onSurroundingClick}>
            <SyncIndicator gameId="game-1" />
          </div>
        </PendingWritesTestHarness>
      </Provider>,
    );

    await user.click(screen.getByRole("button", { name: "1 筆未同步" }));

    expect(onSurroundingClick).not.toHaveBeenCalled();
  });

  it("acknowledges a recovery with the check mark, then clears itself", async () => {
    jest.useFakeTimers();
    store = makeStore();
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    store.dispatch(
      pendingWritesActions.flushFailed({
        gameId: "game-1",
        ids: ["e1"],
        retryable: false,
      }),
    );
    render(
      <Provider store={store}>
        <PendingWritesTestHarness>
          <SyncIndicator gameId="game-1" />
        </PendingWritesTestHarness>
      </Provider>,
    );
    expect(
      screen.getByRole("button", { name: "1 筆未同步" }),
    ).toBeInTheDocument();

    act(() => {
      store.dispatch(
        pendingWritesActions.flushSucceeded({ gameId: "game-1", ids: ["e1"] }),
      );
    });

    // A retry that simply vanished would read as the app having dropped the
    // request rather than completed it.
    expect(screen.getByRole("button", { name: "已同步" })).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(SYNCED_ACK_MS);
    });

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it("does not acknowledge a routine send -- only a recovery from exhausted", () => {
    jest.useFakeTimers();
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
        <PendingWritesTestHarness>
          <SyncIndicator gameId="game-1" />
        </PendingWritesTestHarness>
      </Provider>,
    );

    act(() => {
      store.dispatch(
        pendingWritesActions.flushSucceeded({ gameId: "game-1", ids: ["e1"] }),
      );
    });

    // Every rally goes through this path; a check mark here would sit on
    // screen longer than the send it is acknowledging.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    jest.useRealTimers();
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
      pendingWritesActions.flushFailed({
        gameId: "game-1",
        ids: ["e1"],
        retryable: false,
      }),
    );
    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <PendingWritesTestHarness>
          <SyncIndicator gameId="game-1" />
        </PendingWritesTestHarness>
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
      pendingWritesActions.flushFailed({
        gameId: "game-1",
        ids: ["e0"],
        retryable: false,
      }),
    );
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 1,
      }),
    );
    store.dispatch(
      pendingWritesActions.flushFailed({
        gameId: "game-1",
        ids: ["e1"],
        retryable: false,
      }),
    );
    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <PendingWritesTestHarness>
          <SyncIndicator gameId="game-1" />
        </PendingWritesTestHarness>
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
