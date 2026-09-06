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

// Mocks neither SWR nor Redux, against the Component row of
// docs/testing-strategy.md: the timing under test spans both. The flush
// replaces the set's entries with the server's answer, which cannot include a
// rally recorded after that request went out.
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

  await act(async () => {
    settle({
      entries: [
        { type: "rally", id: "s0", seq: 0 },
        { type: "rally", id: "q1", seq: 1 },
      ],
    });
    await flushed;
  });

  expect(store.getState().pendingWrites.pending.map((p) => p.entry.id)).toEqual(
    ["q2"],
  );
  await waitFor(() =>
    expect(result.current.game.game?.sets[0]?.entries.map((e) => e.id)).toEqual(
      ["s0", "q1", "q2"],
    ),
  );
  const [, firstRequest] = apiClient.mock.calls[0] as [
    string,
    { body: string },
  ];
  const sent = JSON.parse(firstRequest.body) as { id: string }[];
  expect(sent.map((r) => r.id)).toEqual(["q1"]);
});
