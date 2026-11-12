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
import { deferred } from "@test/support/gates";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Provider } from "react-redux";

import { server } from "@test/support/msw/server";
import { answerSignedInUser } from "@test/support/msw/user";

const entry = (id: string) =>
  ({ id, seq: 0, win: true, home: {}, away: {} }) as PendingEntry["entry"];

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

const twoSetGame = { id: "game-1", sets: [{ entries: [] }, { entries: [] }] };

beforeEach(() => {
  answerSignedInUser();
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
    expect(
      screen.queryByRole("button", { name: "重試" }),
    ).not.toBeInTheDocument();
  });

  it("routes validation failures to the entry list", async () => {
    enqueue(store, "e1");
    failUnrecoverably(store, ["e1"]);
    const user = userEvent.setup();
    renderIndicator();

    await user.click(
      screen.getByRole("button", {
        name: "1 筆送不出去，請在紀錄列表中查看這幾筆",
      }),
    );

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

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it("shows retry progress on the retry button itself", async () => {
    const { promise, release } = deferred();
    server.use(
      http.put("/api/games/game-1/sets/entries", async () => {
        await promise;
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
      http.put("/api/games/game-1/sets/entries", async ({ request }) => {
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

  it("counts and retries entries from every pending set of the game", async () => {
    const sent: { si: string | null; ids: string[] }[] = [];
    server.use(
      http.put("/api/games/game-1/sets/entries", async ({ request }) => {
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
