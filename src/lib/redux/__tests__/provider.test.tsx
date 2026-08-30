import { MoveType } from "@/entities/game";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { PENDING_WRITES_KEY } from "@/lib/features/game/pending-writes-storage";
import type {
  PendingEntry,
  PendingWritesState,
  PersistedQueue,
} from "@/lib/features/game/types";
import { ReduxProvider } from "@/lib/redux/provider";
import { makeStore } from "@/lib/redux/store";
import { act, render, screen } from "@testing-library/react";
import { useSelector } from "react-redux";

// Every other test in this Change hands `makeStore` a fake store and calls
// `restorePendingWrites` itself, which leaves untested the two pieces of
// wiring that decide whether any of it runs in the real app: that `makeStore()`
// with no argument reaches localStorage, and that the provider restores on
// mount. jsdom has a real localStorage, so both are checkable here.
//
// `provider.tsx` keeps its store in a module-level singleton, so the provider
// can only be mounted for the first time once per test file -- which is what a
// cold start is. That mount is the second test below.

const entry = (id: string): PendingEntry["entry"] => ({
  id,
  seq: 0,
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

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => localStorage.clear());

describe("persistence wiring", () => {
  it("reaches localStorage when makeStore is called the way the app calls it", async () => {
    // No storage argument: whatever the default is, this is what ships.
    const store = makeStore();
    expect(storedIds()).toBeNull();

    // No await: the first save runs immediately, so the rally is on disk
    // before this line -- which is the property the whole Change rests on.
    store.dispatch(enqueue("e1"));
    expect(storedIds()).toEqual(["e1"]);

    store.dispatch(
      pendingWritesActions.flushSucceeded({ gameId: "game-1", ids: ["e1"] }),
    );
    // This one does await: a save behind an open one collapses to the newest.
    await settled();
    expect(storedIds()).toEqual([]);
  });

  it("restores a previous run's queue when the provider mounts", async () => {
    // What the last run left behind, written by nothing but the store above.
    const previous = makeStore();
    previous.dispatch(enqueue("e1"));
    expect(storedIds()).toEqual(["e1"]);

    // A cold start: the provider builds its own store and reads the disk.
    render(
      <ReduxProvider>
        <Queue />
      </ReduxProvider>,
    );
    // The read is asynchronous, which is the entire reason the restore has to
    // merge rather than replace.
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("queued")).toHaveTextContent("e1");
  });
});
