import { Substitutes } from "@/components/game/panel/substitutes";
import { Toaster } from "@/components/ui/toaster";
import { EntryType, MoveType, Side, upsertEntries } from "@/entities/game";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { deferred } from "@test/support/gates";
import { gameActions } from "@/lib/features/game/game-slice";
import { makeStore } from "@/lib/redux/store";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import { PendingWritesOwner } from "@test/support/react/pending-writes-owner";
import {
  createRecordedRally,
  createRecordedSubstitution,
  toEntryView,
} from "@test/support/fixtures/entries";
import { answerEntries } from "@test/support/msw/entries";
import { server } from "@test/support/msw/server";
import { answerSignedInUser } from "@test/support/msw/user";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Provider } from "react-redux";

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

const renderPanel = async (
  game: ReturnType<typeof gameWith>,
  editingEntryIndex?: number,
  benchPlayer = /選手二/,
  setIndex = 0,
) => {
  server.use(http.get("/api/games/game-1", () => HttpResponse.json(game)));
  const store = makeStore();
  store.dispatch(gameActions.initialize({ game: game as never, setIndex }));
  if (editingEntryIndex === undefined) {
    store.dispatch(
      gameActions.setEntryDraftPlayer({ mode: "general", id: "p1", zone: 1 }),
    );
    store.dispatch(
      gameActions.setEntryDraftSubstitution({
        mode: "general",
        playerId: "p2",
      }),
    );
  } else {
    store.dispatch(
      gameActions.setEditingEntryStatus({
        game: game as never,
        entryIndex: editingEntryIndex,
      }),
    );
  }
  render(
    <SwrIsolation>
      <Provider store={store}>
        <PendingWritesOwner>
          <Substitutes
            gameId="game-1"
            mode={editingEntryIndex === undefined ? "general" : "editing"}
          />
        </PendingWritesOwner>
        <Toaster />
      </Provider>
    </SwrIsolation>,
  );
  await screen.findByRole("button", { name: benchPlayer });
  return { store };
};

beforeEach(() => answerSignedInUser());

describe("Substitutes.onSubmit", () => {
  it("sends the chosen substitute in for the selected player", async () => {
    const puts = answerEntries(() => HttpResponse.json({ entries: [] }));
    await renderPanel(gameWith([]));

    await userEvent.click(screen.getByRole("button", { name: /確認/ }));

    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]!.body).toEqual([
      expect.objectContaining({
        type: EntryType.SUBSTITUTION,
        team: Side.HOME,
        players: { in: "p2", out: "p1" },
      }),
    ]);
  });

  it("sends the substitution to the set being recorded", async () => {
    const puts = answerEntries(() => HttpResponse.json({ entries: [] }));
    const firstSet = gameWith([]);
    await renderPanel(
      { ...firstSet, sets: [...firstSet.sets, ...firstSet.sets] },
      undefined,
      undefined,
      1,
    );

    await userEvent.click(screen.getByRole("button", { name: /確認/ }));

    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]!.si).toBe("1");
  });

  it("refuses a substitution taking off a player the entries already took off and sends nothing", async () => {
    const puts = answerEntries(() => HttpResponse.json({ entries: [] }));
    await renderPanel(
      gameWith([
        {
          type: EntryType.SUBSTITUTION,
          id: "earlier",
          seq: 0,
          team: Side.HOME,
          players: { in: "p2", out: "p1" },
        },
      ]),
      undefined,
      /選手三/,
    );
    await userEvent.click(screen.getByRole("button", { name: /選手三/ }));

    await userEvent.click(screen.getByRole("button", { name: /確認/ }));

    expect(await screen.findByText("換人與目前陣容不符")).toBeInTheDocument();
    expect(puts).toHaveLength(0);
  });
});

describe("Substitutes while editing a substitution", () => {
  const sub = (id: string, seq: number, players: { in: string; out: string }) =>
    toEntryView(
      createRecordedSubstitution({ id, seq, team: Side.HOME, players }),
    );
  const recorded = sub("sub-1", 5, { in: "p2", out: "p1" });
  const swappedBack = [
    recorded,
    toEntryView(
      createRecordedRally({
        id: "rally-1",
        seq: 6,
        home: { score: 2, type: MoveType.ATTACK, num: 0 },
        away: { score: 1, type: MoveType.ATTACK, num: 0 },
      }),
    ),
    sub("sub-2", 7, { in: "p1", out: "p2" }),
  ];

  it("shows the substitute originally chosen as selected, beside the other bench players", async () => {
    await renderPanel(gameWith(swappedBack), 0);

    expect(screen.getByRole("button", { name: /選手二/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /選手三/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("resends the same entry with the corrected player", async () => {
    const puts = answerEntries(() => HttpResponse.json({ entries: [] }));
    await renderPanel(gameWith([recorded]), 0);

    await userEvent.click(screen.getByRole("button", { name: /選手三/ }));
    await userEvent.click(screen.getByRole("button", { name: /確認/ }));

    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]!.body).toEqual([
      expect.objectContaining({
        type: EntryType.SUBSTITUTION,
        id: "sub-1",
        seq: 5,
        team: Side.HOME,
        players: { in: "p3", out: "p1" },
      }),
    ]);
  });

  it("sends the corrected substitution once the write that created it lands, and leaves editing only then", async () => {
    const gate = deferred();
    const puts = answerEntries(async (put, attempt) => {
      if (attempt === 1) await gate.promise;
      return HttpResponse.json({ entries: put.body as object[] });
    });
    const { store } = await renderPanel(gameWith([recorded]), 0);
    act(() => {
      store.dispatch(
        pendingWritesActions.enqueued({
          entry: { ...recorded, at: "2026-01-01T10:00:00.000Z" } as never,
          gameId: "game-1",
          setIndex: 0,
        }),
      );
    });
    await waitFor(() => expect(puts).toHaveLength(1));

    await userEvent.click(screen.getByRole("button", { name: /選手三/ }));
    await userEvent.click(screen.getByRole("button", { name: /確認/ }));
    expect(store.getState().game.editing.entryDraft.id).toBeTruthy();
    gate.release();

    await waitFor(() =>
      expect(store.getState().game.editing.entryDraft.id).toBe(""),
    );
    expect(puts).toHaveLength(2);
    expect(puts[1]!.body).toMatchObject([
      { id: "sub-1", players: { in: "p3", out: "p1" } },
    ]);
  });

  it("blocks an edit that would invalidate a later substitution and names the score it falls on", async () => {
    const puts = answerEntries(() => HttpResponse.json({ entries: [] }));
    await renderPanel(gameWith(swappedBack), 0);

    await userEvent.click(screen.getByRole("button", { name: /選手三/ }));
    await userEvent.click(screen.getByRole("button", { name: /確認/ }));

    expect(
      await screen.findByText("這次修改會讓比分 2:1 時的換人無效"),
    ).toBeInTheDocument();
    expect(puts).toHaveLength(0);
  });
});
