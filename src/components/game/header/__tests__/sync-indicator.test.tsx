import {
  SYNCED_ACK_MS,
  SyncIndicator,
} from "@/components/game/header/sync-indicator";
import {
  PendingWritesContext,
  usePendingWrites,
} from "@/hooks/use-pending-writes";
import { PENDING_WRITE_UNSENT_ATTEMPTS } from "@/lib/features/game/pending-writes";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import type { PendingEntry } from "@/lib/features/game/types";
import { makeStore, type AppStore } from "@/lib/redux/store";
import { SwrIsolation } from "@/test-utils/swr-isolation";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Provider } from "react-redux";

import { server } from "../../../../../test/msw/server";

const entry = (id: string) =>
  ({ id, seq: 0, win: true, home: {}, away: {} }) as PendingEntry["entry"];

// usePendingWrites mounts once in `Game`; this harness stands in for that
// single owner so SyncIndicator can be rendered on its own.
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

const failToThreshold = (store: AppStore, ids: string[]) => {
  for (let i = 0; i < PENDING_WRITE_UNSENT_ATTEMPTS; i++) {
    store.dispatch(
      pendingWritesActions.flushFailed({
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
      ids,
      retryable: false,
      lastError: { code: "VALIDATION", reason: "BAD_REQUEST", status: 400 },
    }),
  );

const enqueue = (
  store: AppStore,
  id: string,
  gameId = "game-1",
  setIndex = 0,
) =>
  store.dispatch(
    pendingWritesActions.enqueued({ entry: entry(id), gameId, setIndex }),
  );

// jsdom reports the device as online; this is the whole of what the browser
// signal can be trusted to say, so the copy branch needs it flipped.
const goOffline = () => {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: false,
  });
  window.dispatchEvent(new Event("offline"));
};

let store: AppStore;
const renderIndicator = (onSurroundingClick?: () => void) =>
  render(
    <SwrIsolation>
      <Provider store={store}>
        <PendingWritesTestHarness>
          <div onClick={onSurroundingClick}>
            <SyncIndicator gameId="game-1" />
          </div>
        </PendingWritesTestHarness>
      </Provider>
    </SwrIsolation>,
  );

// The harness reads the game through the real useGame.
const twoSetGame = { id: "game-1", sets: [{ entries: [] }, { entries: [] }] };

beforeEach(() => {
  store = makeStore();
  server.use(
    http.get("/api/games/game-1", () => HttpResponse.json(twoSetGame)),
  );
});

afterEach(() => {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: true,
  });
});

const UNSENT_LABEL = "連線有問題，1 筆已保存，會持續嘗試送出";

describe("SyncIndicator", () => {
  it("renders no control at all when the queue is empty, but keeps the slot", () => {
    renderIndicator();

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    // The middle column centres its children, so a slot that collapsed
    // would drag the volleyball mark up and down as writes come and go.
    expect(screen.getByTestId("sync-indicator-slot")).toBeInTheDocument();
  });

  it("stops spinning, and says the rallies are safe, once the queue is waiting", async () => {
    enqueue(store, "e1");
    renderIndicator();
    expect(screen.getByRole("button", { name: "同步中" })).toBeInTheDocument();
    expect(screen.getByTestId("sync-spinner")).toBeInTheDocument();

    act(() => failToThreshold(store, ["e1"]));

    expect(screen.queryByTestId("sync-spinner")).not.toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: UNSENT_LABEL }));
    expect(
      await screen.findByText("1 筆已保存，會持續嘗試送出"),
    ).toBeInTheDocument();
  });

  it("shows the count with the retry control once an entry has failed twice", async () => {
    enqueue(store, "e1");
    failToThreshold(store, ["e1"]);
    const user = userEvent.setup();
    renderIndicator();

    await user.click(screen.getByRole("button", { name: UNSENT_LABEL }));

    expect(
      await screen.findByRole("button", { name: "重試" }),
    ).toBeInTheDocument();
  });

  it("promises an automatic send only while the device is off the network", async () => {
    enqueue(store, "e1");
    failToThreshold(store, ["e1"]);
    renderIndicator();

    act(() => goOffline());

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", {
        name: "離線中，1 筆已保存，恢復連線後自動送出",
      }),
    );
    expect(
      await screen.findByText("1 筆已保存，恢復連線後自動送出"),
    ).toBeInTheDocument();
    // It would fail every time, and the recorder already knows the network
    // is off -- the only useful action is turning it back on.
    expect(
      screen.queryByRole("button", { name: "重試" }),
    ).not.toBeInTheDocument();
  });

  it("names an entry that cannot be sent, without a retry control", async () => {
    enqueue(store, "e1");
    failUnrecoverably(store, ["e1"]);
    const user = userEvent.setup();
    renderIndicator();

    await user.click(
      screen.getByRole("button", {
        name: "1 筆送不出去，請在紀錄列表中查看這幾筆",
      }),
    );

    // No action here: what a 4xx needs is to look at the rally itself, and
    // the route to it is the entry list, not this popover.
    expect(
      await screen.findByText("請在紀錄列表中查看這幾筆"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "重試" }),
    ).not.toBeInTheDocument();
  });

  it("speaks up about an unwritable store even with nothing queued", async () => {
    store.dispatch(pendingWritesActions.storageUnavailable());
    const user = userEvent.setup();
    renderIndicator();

    await user.click(
      screen.getByRole("button", {
        name: "本機空間已滿，未送出的紀錄無法保存，請清除瀏覽器的網站資料或改用其他裝置",
      }),
    );
    expect(
      await screen.findByText(
        "未送出的紀錄無法保存，請清除瀏覽器的網站資料或改用其他裝置",
      ),
    ).toBeInTheDocument();
  });

  it("points at the other games' unsent rallies when there are any", async () => {
    enqueue(store, "other", "game-2");
    store.dispatch(pendingWritesActions.storageUnavailable());
    const user = userEvent.setup();
    renderIndicator();

    await user.click(
      screen.getByRole("button", {
        name: "本機空間已滿，請回到其他尚未同步的比賽完成同步，以釋出空間",
      }),
    );
    expect(
      await screen.findByText("請回到其他尚未同步的比賽完成同步，以釋出空間"),
    ).toBeInTheDocument();
  });

  it("ignores pending entries that belong to a different game", () => {
    enqueue(store, "e1", "other-game");
    renderIndicator();

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not open the surrounding block's overview on tap", async () => {
    const onSurroundingClick = jest.fn();
    enqueue(store, "e1");
    failToThreshold(store, ["e1"]);
    const user = userEvent.setup();
    renderIndicator(onSurroundingClick);

    await user.click(screen.getByRole("button", { name: UNSENT_LABEL }));

    expect(onSurroundingClick).not.toHaveBeenCalled();
  });

  it("acknowledges a recovery with the check mark, then clears itself", () => {
    jest.useFakeTimers();
    try {
      enqueue(store, "e1");
      failToThreshold(store, ["e1"]);
      renderIndicator();
      expect(
        screen.getByRole("button", { name: UNSENT_LABEL }),
      ).toBeInTheDocument();

      act(() => {
        store.dispatch(pendingWritesActions.flushSucceeded({ ids: ["e1"] }));
      });

      // A retry that simply vanished would read as the app having dropped the
      // request rather than completed it.
      expect(
        screen.getByRole("button", { name: "已同步" }),
      ).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(SYNCED_ACK_MS);
      });

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it("does not acknowledge a routine send -- only a recovery from exhausted", () => {
    jest.useFakeTimers();
    try {
      enqueue(store, "e1");
      renderIndicator();

      act(() => {
        store.dispatch(pendingWritesActions.flushSucceeded({ ids: ["e1"] }));
      });

      // Every rally goes through this path; a check mark here would sit on
      // screen longer than the send it is acknowledging.
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  // Retry resets nothing the status reads, so without feedback of its own the
  // button looks inert. The feedback stays on the button rather than in the
  // status, which would flash on every background retry too.
  it("shows the retry control as busy while its own request is in flight", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.put("/api/games/game-1/sets/rallies", async () => {
        await gate;
        return HttpResponse.json({ entries: [{ id: "e1" }] });
      }),
    );
    enqueue(store, "e1");
    failToThreshold(store, ["e1"]);
    const user = userEvent.setup();
    renderIndicator();

    await user.click(screen.getByRole("button", { name: UNSENT_LABEL }));
    await user.click(await screen.findByRole("button", { name: "重試" }));

    expect(screen.getByRole("button", { name: "重試" })).toBeDisabled();

    release();
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "重試" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("retry sends the queued rally, closes the popover, and acknowledges the recovery", async () => {
    const sent: { si: string | null; body: unknown }[] = [];
    server.use(
      http.put("/api/games/game-1/sets/rallies", async ({ request }) => {
        sent.push({
          si: new URL(request.url).searchParams.get("si"),
          body: await request.json(),
        });
        return HttpResponse.json({ entries: [{ id: "e1" }] });
      }),
    );
    enqueue(store, "e1");
    failToThreshold(store, ["e1"]);
    const user = userEvent.setup();
    renderIndicator();

    await user.click(screen.getByRole("button", { name: UNSENT_LABEL }));
    await user.click(await screen.findByRole("button", { name: "重試" }));

    expect(
      await screen.findByRole("button", { name: "已同步" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "重試" }),
    ).not.toBeInTheDocument();
    expect(sent).toEqual([
      { si: "0", body: [expect.objectContaining({ id: "e1" })] },
    ]);
  });

  // The reason this slice exists: an entry left over from a set the
  // recorder has moved past must be part of both the count SyncIndicator
  // shows and the set retry can actually clear -- never a number the
  // recorder has no way to act on.
  it("counts and clears entries from every pending set of this game, not just the current one", async () => {
    const sent: { si: string | null; ids: string[] }[] = [];
    server.use(
      http.put("/api/games/game-1/sets/rallies", async ({ request }) => {
        const entries = (await request.json()) as { id: string }[];
        sent.push({
          si: new URL(request.url).searchParams.get("si"),
          ids: entries.map((e) => e.id),
        });
        return HttpResponse.json({ entries });
      }),
    );
    enqueue(store, "e0", "game-1", 0);
    failToThreshold(store, ["e0"]);
    enqueue(store, "e1", "game-1", 1);
    failToThreshold(store, ["e1"]);
    const user = userEvent.setup();
    renderIndicator();

    // The badge counts both sets' failures, not just the current set (0).
    await user.click(
      screen.getByRole("button", {
        name: "連線有問題，2 筆已保存，會持續嘗試送出",
      }),
    );
    await user.click(await screen.findByRole("button", { name: "重試" }));

    await waitFor(() =>
      expect(store.getState().pendingWrites.pending).toHaveLength(0),
    );
    expect(sent).toEqual(
      expect.arrayContaining([
        { si: "0", ids: ["e0"] },
        { si: "1", ids: ["e1"] },
      ]),
    );
    expect(sent).toHaveLength(2);
  });
});
