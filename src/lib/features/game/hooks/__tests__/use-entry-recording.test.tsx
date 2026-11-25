import { EntryType, MoveType, Side, upsertEntries } from "@/entities/game";
import { useGame } from "@/hooks/use-data";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { gameActions } from "@/lib/features/game/game-slice";
import {
  applyEntry,
  applySubstitution,
  deriveEntryPhase,
} from "@/lib/features/game/helpers";
import {
  useEntryRecording,
  type ApplyEntry,
} from "@/lib/features/game/hooks/use-entry-recording";
import type { GameView } from "@/lib/features/game/types";
import { makeStore, type AppStore } from "@/lib/redux/store";
import { deferred } from "@test/support/gates";
import { answerEntries } from "@test/support/msw/entries";
import { server } from "@test/support/msw/server";
import { answerSignedInUser } from "@test/support/msw/user";
import { PendingWritesOwner } from "@test/support/react/pending-writes-owner";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { useSWRConfig } from "swr";

const rallyContent = {
  type: EntryType.RALLY as const,
  win: true,
  home: {
    score: 1,
    type: MoveType.SERVING,
    num: 0,
    player: { id: "p1", zone: 1 },
  },
  away: { score: 0, type: MoveType.SERVING, num: 1 },
};
const recordedRally = { ...rallyContent, id: "e1", seq: 0 };

const lineups = {
  home: {
    options: { liberoReplaceMode: 0, liberoReplacePosition: "" },
    starting: [{ id: "p1", position: "OH" }],
    liberos: [],
    substitutes: [
      { id: "p2", position: "" },
      { id: "p3", position: "" },
    ],
  },
};

const gameWith = (entries: unknown[]) => ({
  id: "game-1",
  info: { scoring: { setCount: 3, decidingSetPoints: 15 } },
  teams: {
    home: {
      players: [
        { id: "p1", name: "選手一", number: 4 },
        { id: "p2", name: "選手二", number: 7 },
        { id: "p3", name: "選手三", number: 9 },
      ],
    },
  },
  sets: [
    {
      options: { serve: "home" },
      startingLineups: lineups,
      lineups: (
        upsertEntries(
          { startingLineups: lineups, entries: [] } as never,
          entries as never,
        ) as { set: { lineups: unknown } }
      ).set.lineups,
      entries,
    },
  ],
});

const swap = (
  id: string,
  seq: number,
  players: { in: string; out: string },
) => ({
  type: EntryType.SUBSTITUTION,
  id,
  seq,
  team: Side.HOME,
  players,
});

const rallyApply =
  (snapshot: GameView): ApplyEntry<typeof rallyContent> =>
  (target, entry) => ({
    game: applyEntry(target, 0, entry, deriveEntryPhase(snapshot, 0, 0, entry)),
  });

const substitutionApply: ApplyEntry<{
  type: EntryType.SUBSTITUTION;
  team: Side;
  players: { in: string; out: string };
}> = (target, entry) => applySubstitution(target, 0, entry);

let store: AppStore;
let cached: () => { sets: { entries: ({ id: string } | undefined)[] }[] };

const renderRecording = async (
  seeded: ReturnType<typeof gameWith>,
  options: {
    editing?: boolean;
    served?: ReturnType<typeof gameWith>;
    loading?: boolean;
  } = {},
) => {
  store = makeStore();
  const response = deferred();
  if (!options.loading) response.release();
  server.use(
    http.get("/api/games/game-1", async () => {
      await response.promise;
      return HttpResponse.json(options.served ?? seeded);
    }),
  );
  store.dispatch(
    gameActions.initialize({ game: seeded as never, setIndex: 0 }),
  );
  if (options.editing) {
    store.dispatch(
      gameActions.setEditingEntryStatus({
        game: seeded as never,
        entryIndex: 0,
      }),
    );
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SwrIsolation>
      <Provider store={store}>
        <PendingWritesOwner>{children}</PendingWritesOwner>
      </Provider>
    </SwrIsolation>
  );
  const view = renderHook(
    () => {
      const { cache } = useSWRConfig();
      cached = () => cache.get("/api/games/game-1")?.data;
      return {
        recording: useEntryRecording("game-1", 0),
        ...useGame("game-1"),
      };
    },
    { wrapper },
  );
  if (!options.loading)
    await waitFor(() => expect(view.result.current.game).toBeDefined());
  return view;
};

const pending = () => store.getState().pendingWrites.pending;

beforeEach(() => answerSignedInUser());

describe("useEntryRecording.record", () => {
  it("returns at once with a fresh entry, shows it and queues it, then flushes in the background", async () => {
    const gate = deferred();
    const puts = answerEntries(async () => {
      await gate.promise;
      return HttpResponse.json({ entries: [{ id: "x", seq: 0 }] });
    });
    const { result } = await renderRecording(gameWith([]));

    let recorded!: ReturnType<typeof result.current.recording.record>;
    const before = Date.now();
    act(() => {
      recorded = result.current.recording.record(
        rallyContent,
        rallyApply(result.current.game!),
      );
    });

    const after = Date.now();

    expect(recorded).toEqual({
      status: "recorded",
      entry: {
        ...rallyContent,
        id: expect.any(String),
        seq: 0,
        at: expect.any(String),
      },
    });
    const { at } = (recorded as { entry: { at: string } }).entry;
    expect(Date.parse(at)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(at)).toBeLessThanOrEqual(after);
    expect(result.current.game!.sets[0]!.entries).toHaveLength(1);
    expect(pending()).toHaveLength(1);
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(pending()).toHaveLength(1);

    gate.release();
    await waitFor(() => expect(pending()).toHaveLength(0));
  });

  it("gives each call its own id and numbers it by the store's entry index", async () => {
    answerEntries(() => HttpResponse.json({ entries: [] }));
    const { result } = await renderRecording(gameWith([recordedRally]));
    const { entryIndex } = store.getState().game.general.status;

    const first = result.current.recording.record(
      rallyContent,
      rallyApply(result.current.game!),
    );
    const second = result.current.recording.record(
      rallyContent,
      rallyApply(result.current.game!),
    );

    if (first.status !== "recorded" || second.status !== "recorded")
      throw new Error("expected both entries to be recorded");
    expect(entryIndex).toBe(1);
    expect(first.entry.seq).toBe(entryIndex);
    expect(second.entry.seq).toBe(entryIndex);
    expect(first.entry.id).not.toBe(second.entry.id);
    await waitFor(() => expect(pending()).toHaveLength(0));
  });
});

describe("useEntryRecording before the game has loaded", () => {
  it("records nothing and queues nothing instead of throwing", async () => {
    const puts = answerEntries(() => HttpResponse.json({ entries: [] }));
    const { result } = await renderRecording(gameWith([]), { loading: true });

    const outcome = result.current.recording.record(
      rallyContent,
      rallyApply(gameWith([]) as never),
    );

    expect(outcome.status).toBe("failed");
    expect(result.current.game).toBeUndefined();
    expect(pending()).toHaveLength(0);
    expect(puts).toHaveLength(0);
  });
});

describe("useEntryRecording.edit", () => {
  it("keeps the entry's id and seq, sends it, and reports success once the write lands", async () => {
    const puts = answerEntries(() =>
      HttpResponse.json({ entries: [{ id: "e1", seq: 5 }] }),
    );
    const { result } = await renderRecording(
      gameWith([{ ...recordedRally, seq: 5 }]),
      {
        editing: true,
      },
    );

    let outcome!: Awaited<ReturnType<typeof result.current.recording.edit>>;
    await act(async () => {
      outcome = await result.current.recording.edit(
        rallyContent,
        rallyApply(result.current.game!),
      );
    });

    expect(outcome).toEqual({
      status: "edited",
      entry: { ...rallyContent, id: "e1", seq: 5, at: expect.any(String) },
    });
    expect(puts).toEqual([
      {
        si: "0",
        body: [expect.objectContaining({ id: "e1", seq: 5 })],
      },
    ]);
    expect(pending()).toHaveLength(0);
  });

  it("keeps editing while a retry replaces a refused edit, and leaves only once the retry lands", async () => {
    const gate = deferred();
    const puts = answerEntries(
      () =>
        HttpResponse.json(
          { code: "VALIDATION", reason: "BAD_REQUEST" },
          { status: 400 },
        ),
      async () => {
        await gate.promise;
        return HttpResponse.json({ entries: [{ id: "e1", seq: 0 }] });
      },
    );
    const { result } = await renderRecording(gameWith([recordedRally]), {
      editing: true,
    });
    const submit = () =>
      result.current.recording.edit(
        rallyContent,
        rallyApply(result.current.game!),
      );

    await act(async () => {
      expect((await submit()).status).toBe("failed");
    });
    expect(store.getState().game.editing.entryDraft.id).toBeTruthy();

    let retry!: ReturnType<typeof submit>;
    act(() => {
      retry = submit();
    });
    await waitFor(() => expect(puts).toHaveLength(2));
    expect(store.getState().game.editing.entryDraft.id).toBeTruthy();

    gate.release();
    await act(async () => {
      expect((await retry).status).toBe("edited");
    });
    expect(pending()).toHaveLength(0);
  });

  it("sends an edit staged while the entry's creation is still in flight, and reports it only once it is written", async () => {
    const gate = deferred();
    const puts = answerEntries(async (put, attempt) => {
      if (attempt === 1) await gate.promise;
      return HttpResponse.json({ entries: put.body as object[] });
    });
    const { result } = await renderRecording(gameWith([]));
    let created!: ReturnType<typeof result.current.recording.record>;
    act(() => {
      created = result.current.recording.record(
        rallyContent,
        rallyApply(result.current.game!),
      );
    });
    await waitFor(() => expect(puts).toHaveLength(1));
    act(() => {
      store.dispatch(
        gameActions.setEditingEntryStatus({
          game: result.current.game as never,
          entryIndex: 0,
        }),
      );
    });
    const edited = { ...rallyContent, away: { ...rallyContent.away, num: 3 } };

    let outcome!: Awaited<ReturnType<typeof result.current.recording.edit>>;
    let finished!: Promise<void>;
    act(() => {
      finished = result.current.recording
        .edit(edited, rallyApply(result.current.game!))
        .then((value) => {
          outcome = value;
        });
    });
    gate.release();
    await act(async () => {
      await finished;
    });

    expect(created.status).toBe("recorded");
    expect(outcome.status).toBe("edited");
    expect(puts).toHaveLength(2);
    expect(puts[1]!.body).toMatchObject([{ away: { num: 3 } }]);
    expect(pending()).toHaveLength(0);
    expect(result.current.game!.sets[0]!.entries[0]).toMatchObject({
      away: { num: 3 },
    });
  });

  it("records which write the edit staged, so the edit can tell it from the entry's earlier writes", async () => {
    answerEntries(() => HttpResponse.error());
    const { result } = await renderRecording(gameWith([recordedRally]), {
      editing: true,
    });

    await act(async () => {
      await result.current.recording.edit(
        rallyContent,
        rallyApply(result.current.game!),
      );
    });

    const [queued] = pending();
    expect(store.getState().game.editing.editWriteKey).toBe(
      `e1@${(queued!.entry as { at: string }).at}`,
    );
  });

  it("sends one write when the background flush is already due as the edit is staged", async () => {
    const gate = deferred();
    const puts = answerEntries(async () => {
      await gate.promise;
      return HttpResponse.json({ entries: [{ id: "e1", seq: 0 }] });
    });
    const { result } = await renderRecording(gameWith([recordedRally]), {
      editing: true,
    });

    let outcome!: Awaited<ReturnType<typeof result.current.recording.edit>>;
    let finished!: Promise<void>;
    act(() => {
      finished = result.current.recording
        .edit(rallyContent, rallyApply(result.current.game!))
        .then((value) => {
          outcome = value;
        });
    });
    await waitFor(() => expect(puts).toHaveLength(1));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(puts).toHaveLength(1);

    gate.release();
    await act(async () => {
      await finished;
    });

    expect(outcome.status).toBe("edited");
    expect(puts).toHaveLength(1);
  });

  it("reports the failure, keeps the edit on screen and queued, and resends it unchanged with the time of the edit", async () => {
    const puts = answerEntries(() => HttpResponse.error());
    const { result } = await renderRecording(
      gameWith([
        { ...recordedRally, away: { ...recordedRally.away, score: 4 } },
      ]),
      { editing: true },
    );

    let outcome!: Awaited<ReturnType<typeof result.current.recording.edit>>;
    const before = Date.now();
    await act(async () => {
      outcome = await result.current.recording.edit(
        rallyContent,
        rallyApply(result.current.game!),
      );
    });
    const after = Date.now();

    expect(outcome.status).toBe("failed");
    expect(pending()).toHaveLength(1);
    expect(result.current.game!.sets[0]!.entries[0]).toMatchObject({
      id: "e1",
      away: { score: 0 },
    });
    const at = (puts[0]!.body as { at: string }[])[0]!.at;
    expect(Date.parse(at)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(at)).toBeLessThanOrEqual(after);
    expect(puts.length).toBeGreaterThan(1);
    expect(puts.map((put) => (put.body as { at: string }[])[0]!.at)).toEqual(
      puts.map(() => at),
    );
  });

  it("merges the edit into the cached game by entry identity when the server has cut the cache back", async () => {
    answerEntries(() =>
      HttpResponse.json(
        { code: "VALIDATION", reason: "BAD_REQUEST" },
        { status: 400 },
      ),
    );
    const { result } = await renderRecording(gameWith([recordedRally]), {
      editing: true,
      served: gameWith([]),
    });

    await act(async () => {
      await result.current.recording.edit(
        rallyContent,
        rallyApply(gameWith([recordedRally]) as never),
      );
    });

    expect(cached().sets[0]!.entries.map((entry) => entry?.id)).toEqual(["e1"]);
  });
});

describe("useEntryRecording with an entry the game refuses", () => {
  const refused = gameWith([swap("earlier", 0, { in: "p2", out: "p1" })]);
  const takeOffAgain = {
    type: EntryType.SUBSTITUTION as const,
    team: Side.HOME,
    players: { in: "p3", out: "p1" },
  };

  it("hands the reason back from record without changing the game or queuing anything", async () => {
    const puts = answerEntries(() => HttpResponse.json({ entries: [] }));
    const { result } = await renderRecording(refused);

    const outcome = result.current.recording.record(
      takeOffAgain,
      substitutionApply,
    );

    expect(outcome).toMatchObject({
      status: "invalid",
      invalid: { substitutionId: expect.any(String) },
    });
    expect(result.current.game!.sets[0]!.entries).toHaveLength(1);
    expect(pending()).toHaveLength(0);
    expect(puts).toHaveLength(0);
  });

  it("checks a substitution against the game with the queued entries but writes it to the cached game", async () => {
    const gate = deferred();
    answerEntries(async () => {
      await gate.promise;
      return HttpResponse.json({ entries: [] });
    });
    const { result } = await renderRecording(gameWith([]));
    act(() => {
      store.dispatch(
        pendingWritesActions.enqueued({
          gameId: "game-1",
          setIndex: 0,
          entry: { ...swap("queued", 0, { in: "p2", out: "p1" }), at: "t" },
        } as never),
      );
    });

    const outcome = result.current.recording.record(
      { ...takeOffAgain, players: { in: "p3", out: "p2" } },
      substitutionApply,
    );

    expect(outcome.status).toBe("recorded");
    expect(cached().sets[0]!.entries).toEqual([]);
    gate.release();
    await waitFor(() => expect(pending()).toHaveLength(0));
  });

  it("hands the reason back from edit without changing the game or queuing anything", async () => {
    const puts = answerEntries(() => HttpResponse.json({ entries: [] }));
    const laterSwapBack = [
      swap("sub-1", 0, { in: "p2", out: "p1" }),
      { ...recordedRally, seq: 1, id: "rally-1" },
      swap("sub-2", 2, { in: "p1", out: "p2" }),
    ];
    const { result } = await renderRecording(gameWith(laterSwapBack), {
      editing: true,
    });

    let outcome!: Awaited<ReturnType<typeof result.current.recording.edit>>;
    await act(async () => {
      outcome = await result.current.recording.edit(
        takeOffAgain,
        substitutionApply,
      );
    });

    expect(outcome.status).toBe("invalid");
    expect(pending()).toHaveLength(0);
    expect(puts).toHaveLength(0);
  });
});
