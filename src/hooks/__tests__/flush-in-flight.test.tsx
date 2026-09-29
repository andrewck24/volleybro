import { act, renderHook, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { Provider } from "react-redux";
import { useGame } from "@/hooks/use-data";
import { usePendingWrites } from "@/hooks/use-pending-writes";
import { EntryType } from "@/entities/game";
import { applyEntry } from "@/lib/features/game/helpers/optimistic/rally.helper";
import type { GameView, PendingEntry } from "@/lib/features/game/types";
import { makeStore, type AppStore } from "@/lib/redux/store";
import { SwrIsolation } from "@test/support/react/swr-isolation";

import { server } from "@test/support/msw/server";

const entry = (id: string, seq: number) =>
  ({
    id,
    seq,
    win: true,
    home: { score: seq },
    away: { score: 0 },
  }) as unknown as PendingEntry["entry"];

const storedRally = (id: string, seq: number) => ({
  type: EntryType.RALLY,
  id,
  seq,
});

const serverGame = () =>
  ({
    id: "game-1",
    win: null,
    info: { scoring: { setCount: 5, decidingSetPoints: 15 } },
    sets: [{ win: null, entries: [storedRally("s0", 0)] }],
  }) as unknown as GameView;

let store: AppStore;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <SwrIsolation>{children}</SwrIsolation>
  </Provider>
);

beforeEach(() => {
  store = makeStore();
});

// The flush replaces the set's entries with the server's answer, which cannot
// include a rally recorded after that request went out.
it("keeps a rally recorded while a flush was already in flight", async () => {
  let settle!: () => void;
  const firstAnswer = new Promise<void>((resolve) => {
    settle = resolve;
  });
  const sent: string[][] = [];
  server.use(
    http.get("/api/games/game-1", () => HttpResponse.json(serverGame())),
    http.put("/api/games/game-1/sets/rallies", async ({ request }) => {
      sent.push(((await request.json()) as { id: string }[]).map((r) => r.id));
      // Enqueuing schedules a background flush for the next macrotask, so a
      // second request goes out mid-test. Only the first is answered:
      // replaying its answer to the second would let a stale response decide
      // what is on screen.
      if (sent.length > 1) await delay("infinite");
      await firstAnswer;
      return HttpResponse.json({
        entries: [storedRally("s0", 0), storedRally("q1", 1)],
      });
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
  await waitFor(() => expect(sent).toHaveLength(1));

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
    settle();
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
  expect(sent[0]).toEqual(["q1"]);
});
