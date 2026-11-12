import { EntryType, MoveType } from "@/entities/game";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { PENDING_WRITES_KEY } from "@/lib/features/game/pending-writes-storage";
import type {
  PendingEntry,
  PendingWritesState,
  PersistedQueue,
} from "@/lib/features/game/types";
import { ReduxProvider } from "@/lib/redux/provider";
import { makeStore } from "@/lib/redux/store";
import { render, screen, waitFor } from "@testing-library/react";
import { useSelector } from "react-redux";

const entry = (id: string): PendingEntry["entry"] => ({
  type: EntryType.RALLY,
  id,
  seq: 0,
  at: "2026-10-27T01:02:03.000Z",
  win: true,
  home: { score: 1, type: MoveType.ATTACK, num: 7 },
  away: { score: 0, type: MoveType.DEFENSE, num: 3 },
});

const enqueue = (id: string) =>
  pendingWritesActions.enqueued({
    entry: entry(id),
    gameId: "game-1",
    setIndex: 0,
  });

const storedIds = () => {
  const raw = localStorage.getItem(PENDING_WRITES_KEY);
  if (raw === null) return null;
  return (JSON.parse(raw) as PersistedQueue).items.map((i) => i.entry.id);
};

const Queue = () => {
  const ids = useSelector((state: { pendingWrites: PendingWritesState }) =>
    state.pendingWrites.pending.map((p) => p.entry.id).join(","),
  );
  return <span data-testid="queued">{ids}</span>;
};

afterEach(() => localStorage.clear());

describe("persistence wiring", () => {
  it("reaches localStorage when makeStore is called the way the app calls it", async () => {
    const store = makeStore();
    expect(storedIds()).toBeNull();

    store.dispatch(enqueue("e1"));
    expect(storedIds()).toEqual(["e1"]);

    store.dispatch(pendingWritesActions.flushSucceeded({ ids: ["e1"] }));
    await waitFor(() => expect(storedIds()).toEqual([]));
  });

  it("restores a previous run's queue when the provider mounts", async () => {
    const previous = makeStore();
    previous.dispatch(enqueue("e1"));
    expect(storedIds()).toEqual(["e1"]);

    render(
      <ReduxProvider>
        <Queue />
      </ReduxProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("queued")).toHaveTextContent("e1"),
    );
  });

  it("renders on a cold server start without reading browser storage", async () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    let reads = 0;
    let markup = "";
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get: () => {
        reads += 1;
        throw new ReferenceError("localStorage is not defined");
      },
    });

    try {
      await jest.isolateModulesAsync(async () => {
        const React = await import("react");
        const { useSelector: useIsolatedSelector } =
          await import("react-redux");
        const { renderToString } = await import("react-dom/server");
        const { ReduxProvider: ColdReduxProvider } =
          await import("@/lib/redux/provider");
        const ColdQueue = () => {
          const ids = useIsolatedSelector(
            (state: { pendingWrites: PendingWritesState }) =>
              state.pendingWrites.pending
                .map((pending) => pending.entry.id)
                .join(","),
          );
          return React.createElement("span", { "data-testid": "queued" }, ids);
        };
        markup = renderToString(
          React.createElement(
            ColdReduxProvider,
            null,
            React.createElement(ColdQueue),
          ),
        );
      });

      expect(reads).toBe(0);
      expect(markup).toContain('data-testid="queued"');
    } finally {
      if (original) {
        Object.defineProperty(window, "localStorage", original);
      } else {
        delete (window as unknown as { localStorage?: Storage }).localStorage;
      }
    }
  });
});
