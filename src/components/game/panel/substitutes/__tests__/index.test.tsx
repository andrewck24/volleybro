import { Substitutes } from "@/components/game/panel/substitutes";
import { Toaster } from "@/components/ui/toaster";
import { EntryType, MoveType, Side, recomputeLineups } from "@/entities/game";
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
import { render, screen, waitFor } from "@testing-library/react";
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

// `current` stands for a device whose lineup has not caught up with the
// entries it holds; by default the lineup follows the entries.
const gameWith = (entries: unknown[], current?: typeof lineups) => ({
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
      lineups:
        current ?? recomputeLineups(lineups as never, entries as never).lineups,
      entries,
    },
  ],
});

const renderPanel = async (
  game: ReturnType<typeof gameWith>,
  editingEntryIndex?: number,
) => {
  server.use(http.get("/api/games/game-1", () => HttpResponse.json(game)));
  const store = makeStore();
  store.dispatch(gameActions.initialize({ game: game as never, setIndex: 0 }));
  if (editingEntryIndex === undefined) {
    store.dispatch(gameActions.setEntryDraftPlayer({ id: "p1", zone: 1 }));
    store.dispatch(gameActions.setEntryDraftSubstitution("p2"));
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
  // The candidate list is built from the loaded game.
  await screen.findByRole("button", { name: /選手二/ });
};

describe("Substitutes.onSubmit", () => {
  it("sends the substitution through the entries endpoint with the time it was made", async () => {
    const puts = answerEntries(() => HttpResponse.json({ entries: [] }));
    await renderPanel(gameWith([]));

    const before = Date.now();
    await userEvent.click(screen.getByRole("button", { name: /確認/ }));
    const after = Date.now();

    await waitFor(() => expect(puts).toHaveLength(1));
    const { si, body } = puts[0]!;
    expect(si).toBe("0");
    expect(body).toEqual([
      {
        type: EntryType.SUBSTITUTION,
        id: expect.any(String),
        seq: 0,
        at: expect.any(String),
        team: Side.HOME,
        players: { in: "p2", out: "p1" },
      },
    ]);
    const { at } = (body as { at: string }[])[0]!;
    expect(new Date(at).toISOString()).toBe(at);
    expect(Date.parse(at)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(at)).toBeLessThanOrEqual(after);
  });

  it("refuses a substitution the lineup cannot take and sends nothing", async () => {
    const puts = answerEntries(() => HttpResponse.json({ entries: [] }));
    // Another recorder already took p1 off, which this device has not seen in
    // its current lineup yet.
    await renderPanel(
      gameWith(
        [
          {
            type: EntryType.SUBSTITUTION,
            id: "earlier",
            seq: 0,
            team: Side.HOME,
            players: { in: "p2", out: "p1" },
          },
        ],
        lineups,
      ),
    );

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
  // The substitute went on at seq 5 and came off for the starter at seq 7.
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

  it("resends the same entry with the corrected player and the time of the edit", async () => {
    const puts = answerEntries(() => HttpResponse.json({ entries: [] }));
    await renderPanel(gameWith([recorded]), 0);

    await userEvent.click(screen.getByRole("button", { name: /選手三/ }));
    await userEvent.click(screen.getByRole("button", { name: /確認/ }));

    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]!.body).toEqual([
      {
        type: EntryType.SUBSTITUTION,
        id: "sub-1",
        seq: 5,
        at: expect.any(String),
        team: Side.HOME,
        players: { in: "p3", out: "p1" },
      },
    ]);
  });

  it("blocks an edit that would invalidate a later substitution and names the point it falls on", async () => {
    const puts = answerEntries(() => HttpResponse.json({ entries: [] }));
    await renderPanel(gameWith(swappedBack), 0);

    // Putting p3 on instead of p2 leaves p2 off court when seq 7 takes them off.
    await userEvent.click(screen.getByRole("button", { name: /選手三/ }));
    await userEvent.click(screen.getByRole("button", { name: /確認/ }));

    expect(
      await screen.findByText("這次修改會讓第 3 分的換人無效"),
    ).toBeInTheDocument();
    expect(puts).toHaveLength(0);
  });
});
