import {
  SYNCED_ACK_MS,
  SyncIndicator,
} from "@/components/game/header/sync-indicator";
import {
  PendingWritesContext,
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
    <PendingWritesContext.Provider value={pendingWrites}>
      {children}
    </PendingWritesContext.Provider>
  );
};

// Two measured failures is what the queue needs before it stops reading as
// work in progress; one is a hiccup the first background retry usually clears.
const failTwice = (store: AppStore, ids: string[]) => {
  for (let i = 0; i < 2; i++) {
    store.dispatch(
      pendingWritesActions.flushFailed({
        gameId: "game-1",
        ids,
        retryable: true,
        lastError: { code: "TRANSIENT", reason: "NETWORK_ERROR", status: 503 },
      }),
    );
  }
};

// A 4xx: waiting does not improve it, so nothing will send this entry.
const failUnrecoverably = (store: AppStore, ids: string[]) =>
  store.dispatch(
    pendingWritesActions.flushFailed({
      gameId: "game-1",
      ids,
      retryable: false,
      lastError: { code: "VALIDATION", reason: "BAD_REQUEST", status: 400 },
    }),
  );

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

  it("shows the count with the retry control once an entry has failed twice", async () => {
    store = makeStore();
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    failTwice(store, ["e1"]);
    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <PendingWritesTestHarness>
          <SyncIndicator gameId="game-1" />
        </PendingWritesTestHarness>
      </Provider>,
    );

    const button = screen.getByRole("button", { name: "1 筆未同步" });
    // Waiting is not a warning: these entries send themselves once the
    // connection is back, so the tone stays neutral.
    expect(button).not.toHaveClass("ring-warning/30");

    await user.click(button);

    expect(
      await screen.findByRole("button", { name: "重試" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("sync-popover-icon")).not.toHaveClass(
      "text-warning",
    );
  });

  // The warning tone belongs to the one condition the recorder has to act on:
  // an entry a retry cannot fix. The popover's own icon carries that colour
  // explicitly -- it does not inherit it from the trigger button, which is a
  // different element in the portalled popover content.
  it("wears the warning tone, without a retry control, for an entry that cannot be sent", async () => {
    store = makeStore();
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    failUnrecoverably(store, ["e1"]);
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

    expect(screen.getByTestId("sync-popover-icon")).toHaveClass("text-warning");
    // Retrying a 4xx fails the same way; the route to resolving it is the
    // per-rally control in the entry list, not this popover.
    expect(
      screen.queryByRole("button", { name: "重試" }),
    ).not.toBeInTheDocument();
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
    failTwice(store, ["e1"]);
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
    failTwice(store, ["e1"]);
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
    failTwice(store, ["e1"]);
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
    failTwice(store, ["e0"]);
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry("e1"),
        gameId: "game-1",
        setIndex: 1,
      }),
    );
    failTwice(store, ["e1"]);
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
