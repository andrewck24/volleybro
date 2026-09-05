import { act, renderHook, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { SWRConfig } from "swr";
import { useGame } from "@/hooks/use-data";
import {
  applyEntry,
  deriveEntryPhase,
} from "@/lib/features/game/helpers/optimistic/rally.helper";
import { applyFlushedEntries } from "@/lib/features/game/pending-writes";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import type { GameView, PendingEntry } from "@/lib/features/game/types";
import { makeStore, type AppStore } from "@/lib/redux/store";

const serverGame = (seqs: number[]): GameView =>
  ({
    id: "game-1",
    win: null,
    info: { scoring: { setCount: 5, decidingSetPoints: 15 } },
    sets: [
      {
        win: null,
        entries: seqs.map((seq) => ({ type: "rally", id: `s${seq}`, seq })),
      },
    ],
  }) as never;

const entry = (id: string, seq: number) =>
  ({ id, seq, win: true, home: {}, away: {} }) as PendingEntry["entry"];

let store: AppStore;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  </Provider>
);

const enqueue = (id: string, seq: number) =>
  act(() => {
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: entry(id, seq),
        gameId: "game-1",
        setIndex: 0,
      }),
    );
  });

beforeEach(() => {
  store = makeStore();
});

it("keeps queued rallies on screen across a revalidation", async () => {
  const fetcher = jest.fn(async () => serverGame([0]));
  const { result } = renderHook(() => useGame("game-1", fetcher), { wrapper });

  await waitFor(() => expect(result.current.game).toBeDefined());
  enqueue("q1", 1);
  expect(result.current.game?.sets[0]?.entries.map((e) => e.id)).toEqual([
    "s0",
    "q1",
  ]);

  await act(async () => {
    await result.current.mutate();
  });

  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(result.current.game?.sets[0]?.entries.map((e) => e.id)).toEqual([
    "s0",
    "q1",
  ]);
});

it("orders a queued rally by its seq, not by arrival", async () => {
  const fetcher = jest.fn(async () => serverGame([0, 2]));
  const { result } = renderHook(() => useGame("game-1", fetcher), { wrapper });

  await waitFor(() => expect(result.current.game).toBeDefined());
  enqueue("q1", 1);

  expect(result.current.game?.sets[0]?.entries.map((e) => e.id)).toEqual([
    "s0",
    "q1",
    "s2",
  ]);
});

it("records two rallies without either landing in the cache twice", async () => {
  const fetcher = jest.fn(async () => serverGame([0]));
  const { result } = renderHook(() => useGame("game-1", fetcher), { wrapper });
  await waitFor(() => expect(result.current.game).toBeDefined());

  const record = async (id: string, entryIndex: number) => {
    const draft = {
      id,
      seq: entryIndex,
      win: true,
      home: { score: entryIndex, type: 0, num: 0 },
      away: { score: 0 },
    } as never;
    const phase = deriveEntryPhase(result.current.game!, 0, entryIndex, draft);
    await act(async () => {
      await result.current.mutate((raw) => applyEntry(raw!, 0, draft, phase), {
        revalidate: false,
      });
    });
    enqueue(id, entryIndex);
  };

  await record("q1", 1);
  await record("q2", 2);

  let cached: GameView | undefined;
  await act(async () => {
    await result.current.mutate(
      (raw) => {
        cached = raw;
        return raw;
      },
      { revalidate: false },
    );
  });

  expect(cached?.sets[0]?.entries.map((e) => e.id)).toEqual(["s0", "q1", "q2"]);
  expect(result.current.game?.sets[0]?.entries.map((e) => e.id)).toEqual([
    "s0",
    "q1",
    "q2",
  ]);
});

it("records onto a cache the server has cut back, without leaving a gap", async () => {
  const fetcher = jest.fn(async () => serverGame([0]));
  const { result } = renderHook(() => useGame("game-1", fetcher), { wrapper });
  await waitFor(() => expect(result.current.game).toBeDefined());

  enqueue("q1", 1);
  await act(async () => {
    await result.current.mutate();
  });

  const entryIndex = result.current.game!.sets[0]!.entries.length;
  expect(entryIndex).toBe(2);

  const draft = { id: "q2", seq: entryIndex, win: true, home: {}, away: {} };
  const phase = deriveEntryPhase(
    result.current.game!,
    0,
    entryIndex,
    draft as never,
  );
  await act(async () => {
    await result.current.mutate(
      (raw) => applyEntry(raw!, 0, draft as never, phase),
      { revalidate: false },
    );
  });
  enqueue("q2", entryIndex);

  let cached: GameView | undefined;
  await act(async () => {
    await result.current.mutate(
      (raw) => {
        cached = raw;
        return raw;
      },
      { revalidate: false },
    );
  });

  const cachedEntries = cached!.sets[0]!.entries;
  expect(cachedEntries.map((e) => e.id)).toEqual(["s0", "q2"]);
  expect(cachedEntries.every((e) => e !== undefined)).toBe(true);
  expect(result.current.game?.sets[0]?.entries.map((e) => e.id)).toEqual([
    "s0",
    "q1",
    "q2",
  ]);
});

it("shows rallies restored from disk once the game loads", async () => {
  act(() => {
    store.dispatch(
      pendingWritesActions.rehydrated({
        items: [{ entry: entry("q1", 1), gameId: "game-1", setIndex: 0 }],
      }),
    );
  });

  const fetcher = jest.fn(async () => serverGame([0]));
  const { result } = renderHook(() => useGame("game-1", fetcher), { wrapper });

  await waitFor(() => expect(result.current.game).toBeDefined());
  expect(result.current.game?.sets[0]?.entries.map((e) => e.id)).toEqual([
    "s0",
    "q1",
  ]);
});

// A flush replaces the set's entries wholesale with the server's answer.
it("keeps a rally recorded while a flush was in flight", async () => {
  const fetcher = jest.fn(async () => serverGame([0]));
  const { result } = renderHook(() => useGame("game-1", fetcher), { wrapper });
  await waitFor(() => expect(result.current.game).toBeDefined());

  enqueue("q1", 1);
  enqueue("q2", 2);

  await act(async () => {
    await result.current.mutate(
      (raw) =>
        applyFlushedEntries(raw, 0, [
          ...raw!.sets[0]!.entries,
          { type: "rally", id: "q1", seq: 1 } as never,
        ])!,
      { revalidate: false },
    );
  });
  act(() => {
    store.dispatch(pendingWritesActions.flushSucceeded({ ids: ["q1"] }));
  });

  expect(result.current.game?.sets[0]?.entries.map((e) => e.id)).toEqual([
    "s0",
    "q1",
    "q2",
  ]);
});
