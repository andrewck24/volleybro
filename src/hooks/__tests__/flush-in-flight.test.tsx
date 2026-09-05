import { act, renderHook, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { SWRConfig } from "swr";
import { useGame } from "@/hooks/use-data";
import { usePendingWrites } from "@/hooks/use-pending-writes";
import * as apiClientModule from "@/lib/api/api-client";
import { applyEntry } from "@/lib/features/game/helpers/optimistic/rally.helper";
import type { GameView, PendingEntry } from "@/lib/features/game/types";
import { makeStore, type AppStore } from "@/lib/redux/store";

jest.mock("@/lib/api/api-client", () => ({
  ...jest.requireActual("@/lib/api/api-client"),
  apiClient: jest.fn(),
}));
const apiClient = apiClientModule.apiClient as jest.Mock;

const entry = (id: string, seq: number) =>
  ({
    id,
    seq,
    win: true,
    home: { score: seq },
    away: { score: 0 },
  }) as unknown as PendingEntry["entry"];

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

let store: AppStore;
// usePendingWrites calls useGame on the same key, so the cache is seeded
// rather than fetched: whichever fetcher SWR registers first would win.
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <SWRConfig
      value={{
        provider: () =>
          new Map([["/api/games/game-1", { data: serverGame([0]) }]]) as never,
      }}
    >
      {children}
    </SWRConfig>
  </Provider>
);

beforeEach(() => {
  store = makeStore();
  apiClient.mockReset();
});

// The flush replaces the set's entries with the server's answer, which cannot
// include a rally recorded after that request went out.
it("keeps a rally recorded while a flush was already in flight", async () => {
  let settle!: (value: { entries: unknown[] }) => void;
  apiClient.mockReturnValue(
    new Promise((resolve) => {
      settle = resolve;
    }),
  );

  const { result } = renderHook(
    () => ({
      queue: usePendingWrites("game-1", 0),
      game: useGame("game-1"),
    }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.game.game).toBeDefined());

  // First rally: optimistic write, queued, flush leaves and stays out.
  const first = entry("q1", 1);
  await act(async () => {
    await result.current.game.mutate(
      (raw) =>
        applyEntry(raw!, 0, first as never, {
          isSetInProgress: true,
          isSetPoint: false,
        }),
      { revalidate: false },
    );
  });
  act(() => result.current.queue.enqueue(first));
  let flushed!: Promise<unknown>;
  act(() => {
    flushed = result.current.queue.flush();
  });

  // Second rally, recorded before the first request comes back.
  const second = entry("q2", 2);
  await act(async () => {
    await result.current.game.mutate(
      (raw) =>
        applyEntry(raw!, 0, second as never, {
          isSetInProgress: true,
          isSetPoint: false,
        }),
      { revalidate: false },
    );
  });
  act(() => result.current.queue.enqueue(second));

  // The server answers for the first rally alone, replacing the set's entries.
  await act(async () => {
    settle({
      entries: [
        { type: "rally", id: "s0", seq: 0 },
        { type: "rally", id: "q1", seq: 1 },
      ],
    });
    await flushed;
  });

  // The flush confirmed only what it sent; the newer rally is still queued.
  expect(store.getState().pendingWrites.pending.map((p) => p.entry.id)).toEqual(
    ["q2"],
  );
  await waitFor(() =>
    expect(result.current.game.game?.sets[0]?.entries.map((e) => e.id)).toEqual(
      ["s0", "q1", "q2"],
    ),
  );
  // The request that was already out could not have carried the second rally.
  const [, firstRequest] = apiClient.mock.calls[0]!;
  expect(JSON.stringify(firstRequest)).toContain("q1");
  expect(JSON.stringify(firstRequest)).not.toContain("q2");
});
