import {
  OppoMoves,
  useSubmitEntryDraft,
} from "@/components/game/panel/moves/oppo";
import { EntryType, MoveType, Side } from "@/entities/game";
import { useGame } from "@/hooks/use-data";
import { usePendingWrites } from "@/hooks/use-pending-writes";
import { gameActions } from "@/lib/features/game/game-slice";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { makeStore, type AppStore } from "@/lib/redux/store";
import { scoringMoves } from "@/lib/scoring-moves";
import { answerEntries } from "@test/support/msw/entries";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Provider } from "react-redux";
import { useSWRConfig } from "swr";

import { server } from "@test/support/msw/server";
import { answerSignedInUser } from "@test/support/msw/user";
import { deferred } from "@test/support/gates";

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

beforeEach(() => answerSignedInUser());

describe("useSubmitEntryDraft update path", () => {
  it("stays in editing mode and keeps the edit queued when the write fails", async () => {
    const puts = answerEntries(() => HttpResponse.error());
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
    expect(result.current.game!.sets[0]!.entries[0]).toMatchObject({
      id: "e1",
      home: { num: scoringMoves[3]!.num },
    });
  });

  it("confirms the edit and returns to general mode once the write succeeds", async () => {
    const puts = answerEntries(() =>
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

describe("useSubmitEntryDraft create path", () => {
  it("advances the draft when an entry is enqueued", async () => {
    const gate = deferred();
    const puts = answerEntries(async () => {
      await gate.promise;
      return HttpResponse.json({ entries: [{ id: "new-entry" }] });
    });
    store = makeStore();
    const game = gameWith([]);
    server.use(http.get("/api/games/game-1", () => HttpResponse.json(game)));
    store.dispatch(
      gameActions.initialize({ game: game as never, setIndex: 0 }),
    );
    store.dispatch(gameActions.setEntryDraftPlayer({ id: "p1", zone: 1 }));
    store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
    store.dispatch(
      gameActions.setEntryDraftAwayMove(
        scoringMoves[scoringMoves[3]!.outcome[0]!]!,
      ),
    );
    const { result } = renderHook(useHarness, { wrapper });
    await waitFor(() => expect(result.current.game).toBeDefined());

    await act(async () => {
      await result.current.submit();
    });
    await waitFor(() => expect(puts).toHaveLength(1));

    expect(store.getState().game.general.status.entryIndex).toBe(1);
    expect(store.getState().pendingWrites.pending).toHaveLength(1);
    expect(result.current.game?.sets[0]?.entries).toHaveLength(1);

    gate.release();
    await waitFor(() =>
      expect(store.getState().pendingWrites.pending).toHaveLength(0),
    );
  });

  it("stages an away move without submitting it", async () => {
    const homeMove = scoringMoves[3]!;
    const awayMove = scoringMoves[homeMove.outcome[0]!]!;
    const alternateAwayMove = scoringMoves[homeMove.outcome[1]!]!;
    const puts = answerEntries(() => HttpResponse.json({ entries: [] }));
    store = makeStore();
    const game = gameWith([]);
    store.dispatch(
      gameActions.initialize({ game: game as never, setIndex: 0 }),
    );
    store.dispatch(gameActions.setEntryDraftPlayer({ id: "p1", zone: 1 }));
    store.dispatch(gameActions.setEntryDraftHomeMove(homeMove));
    render(
      <Provider store={store}>
        <OppoMoves />
      </Provider>,
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: new RegExp(alternateAwayMove.text),
      }),
    );

    expect(store.getState().game.general.entryDraft.away.num).toBe(
      alternateAwayMove.num,
    );
    expect(store.getState().game.general.entryDraft.away.num).not.toBe(
      awayMove.num,
    );
    expect(store.getState().pendingWrites.pending).toHaveLength(0);
    expect(puts).toHaveLength(0);
  });
});

const sentAt = (put: { body: unknown }) =>
  (put.body as { at: string }[])[0]!.at;

describe("useSubmitEntryDraft action time", () => {
  it("stamps an edit with the moment it was made and resends it unchanged", async () => {
    const puts = answerEntries(
      () => HttpResponse.error(),
      () => HttpResponse.json({ entries: [{ id: "e1" }] }),
    );
    const { result } = await editFirstEntry(gameWith([rally]));
    act(() => {
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
    });

    const before = Date.now();
    await act(async () => {
      await result.current.submit();
    });
    const after = Date.now();

    expect(puts.length).toBeGreaterThan(1);
    const at = sentAt(puts[0]!);
    expect(new Date(at).toISOString()).toBe(at);
    expect(Date.parse(at)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(at)).toBeLessThanOrEqual(after);
    expect(puts.map(sentAt)).toEqual(puts.map(() => at));
  });

  it("stamps a new rally with the moment it was created", async () => {
    const puts = answerEntries(() =>
      HttpResponse.json({ entries: [{ id: "x" }] }),
    );
    store = makeStore();
    const game = gameWith([]);
    server.use(http.get("/api/games/game-1", () => HttpResponse.json(game)));
    store.dispatch(
      gameActions.initialize({ game: game as never, setIndex: 0 }),
    );
    store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
    store.dispatch(
      gameActions.setEntryDraftAwayMove(
        scoringMoves[scoringMoves[3]!.outcome[0]!]!,
      ),
    );
    const { result } = renderHook(useHarness, { wrapper });
    await waitFor(() => expect(result.current.game).toBeDefined());

    const before = Date.now();
    await act(async () => {
      await result.current.submit();
    });
    const after = Date.now();

    await waitFor(() => expect(puts).toHaveLength(1));
    expect(Date.parse(sentAt(puts[0]!))).toBeGreaterThanOrEqual(before);
    expect(Date.parse(sentAt(puts[0]!))).toBeLessThanOrEqual(after);
  });
});

describe("useSubmitEntryDraft against a cache the server has cut back", () => {
  it("merges an edit into raw cache by entry identity", async () => {
    answerEntries(() =>
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
        entry: { ...rally, at: new Date().toISOString() } as never,
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
    const puts = answerEntries(() => HttpResponse.json({ entries: [] }));
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
