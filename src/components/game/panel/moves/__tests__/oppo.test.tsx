import { useSubmitEntryDraft } from "@/components/game/panel/moves/oppo";
import { EntryType, MoveType, Side } from "@/entities/game";
import { useGame } from "@/hooks/use-data";
import { usePendingWrites } from "@/hooks/use-pending-writes";
import { gameActions } from "@/lib/features/game/game-slice";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { makeStore, type AppStore } from "@/lib/redux/store";
import { scoringMoves } from "@/lib/scoring-moves";
import { SwrIsolation } from "@/test-utils/swr-isolation";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Provider } from "react-redux";
import { useSWRConfig } from "swr";

import { server } from "../../../../../../test/msw/server";

const rally = {
  id: "e1",
  seq: 0,
  type: EntryType.RALLY,
  win: true,
  home: {
    score: 1,
    type: MoveType.SERVING,
    num: 0,
    player: { id: "p1", zone: 1 },
  },
  away: { score: 0, type: MoveType.SERVING, num: 1 },
};
const gameWith = (entries: unknown[]) => ({
  id: "game-1",
  info: { scoring: { setCount: 3, decidingSetPoints: 15 } },
  teams: { home: { players: [{ id: "p1", name: "選手一", number: 4 }] } },
  sets: [{ options: { serve: "home" }, entries }],
});

// Stands in for Game, the single mounted owner of usePendingWrites; also
// exposes what the page would read, and the raw SWR cache entry behind it.
const useHarness = () => {
  const pendingWrites = usePendingWrites("game-1", 0);
  const submit = useSubmitEntryDraft("game-1", pendingWrites);
  const { game } = useGame("game-1");
  const { cache } = useSWRConfig();
  return { submit, game, cached: () => cache.get("/api/games/game-1")?.data };
};

let store: AppStore;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SwrIsolation>
    <Provider store={store}>{children}</Provider>
  </SwrIsolation>
);

type PutRequest = { si: string | null; body: { id: string }[] };
const answerRallies = (respond: (put: PutRequest) => Response) => {
  const puts: PutRequest[] = [];
  server.use(
    http.put("/api/games/game-1/sets/rallies", async ({ request }) => {
      const put = {
        si: new URL(request.url).searchParams.get("si"),
        body: (await request.json()) as PutRequest["body"],
      };
      puts.push(put);
      return respond(put);
    }),
  );
  return puts;
};

const editFirstEntry = (game: ReturnType<typeof gameWith>) => {
  store = makeStore();
  server.use(http.get("/api/games/game-1", () => HttpResponse.json(game)));
  store.dispatch(gameActions.initialize({ game: game as never, setIndex: 0 }));
  store.dispatch(
    gameActions.setEditingEntryStatus({ game: game as never, entryIndex: 0 }),
  );
  const view = renderHook(useHarness, { wrapper });
  return waitFor(() => expect(view.result.current.game).toBeDefined()).then(
    () => view,
  );
};

describe("useSubmitEntryDraft update path", () => {
  it("stays in editing mode and keeps the edit queued when the write fails", async () => {
    const puts = answerRallies(() => HttpResponse.error());
    const { result } = await editFirstEntry(gameWith([rally]));
    act(() => {
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(puts.length).toBeGreaterThan(0);
    expect(store.getState().game.mode).toBe("editing");
    expect(store.getState().pendingWrites.pending).toHaveLength(1);
    // The recorder keeps seeing their edit while it waits to be sent.
    expect(result.current.game!.sets[0]!.entries[0]).toMatchObject({
      id: "e1",
      home: { num: scoringMoves[3]!.num },
    });
  });

  it("confirms the edit and returns to general mode once the write succeeds", async () => {
    const puts = answerRallies(() =>
      HttpResponse.json({ entries: [{ id: "e1" }] }),
    );
    const { result } = await editFirstEntry(gameWith([rally]));

    await act(async () => {
      await result.current.submit();
    });

    expect(puts).toEqual([
      { si: "0", body: [expect.objectContaining({ id: "e1", seq: 0 })] },
    ]);
    expect(store.getState().game.mode).toBe("general");
    expect(store.getState().pendingWrites.pending).toHaveLength(0);
  });
});

describe("useSubmitEntryDraft against a cache the server has cut back", () => {
  it("writes the edited rally by its identity, leaving no gap in the cache", async () => {
    // The queue still holds e1 (unsent) while the server's copy of the set is
    // empty; a positional write would leave a hole at index 0.
    answerRallies(() =>
      HttpResponse.json(
        { code: "VALIDATION", reason: "BAD_REQUEST" },
        { status: 400 },
      ),
    );
    store = makeStore();
    const full = gameWith([rally]);
    server.use(
      http.get("/api/games/game-1", () => HttpResponse.json(gameWith([]))),
    );
    store.dispatch(
      gameActions.initialize({ game: full as never, setIndex: 0 }),
    );
    store.dispatch(
      gameActions.setEditingEntryStatus({ game: full as never, entryIndex: 0 }),
    );
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: rally as never,
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    const { result } = renderHook(useHarness, { wrapper });
    await waitFor(() => expect(result.current.game).toBeDefined());

    await act(async () => {
      await result.current.submit();
    });

    const entries = result.current.cached().sets[0].entries as (
      { id: string } | undefined
    )[];
    expect(entries.map((e) => e?.id)).toEqual(["e1"]);
  });

  it("throws before queuing anything when the entry is not a rally", async () => {
    const puts = answerRallies(() => HttpResponse.json({ entries: [] }));
    const timeout = {
      id: "e1",
      seq: 0,
      type: EntryType.TIMEOUT,
      team: Side.HOME,
    };
    const { result } = await editFirstEntry(gameWith([timeout]));

    await expect(
      act(async () => {
        await result.current.submit();
      }),
    ).rejects.toThrow("Entry is not a rally");

    expect(store.getState().pendingWrites.pending).toHaveLength(0);
    expect(puts).toHaveLength(0);
  });
});
