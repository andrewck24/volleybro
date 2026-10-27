import { Substitutes } from "@/components/game/panel/substitutes";
import { Toaster } from "@/components/ui/toaster";
import { EntryType, Side } from "@/entities/game";
import { gameActions } from "@/lib/features/game/game-slice";
import { makeStore } from "@/lib/redux/store";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import { PendingWritesOwner } from "@test/support/react/pending-writes-owner";
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
    substitutes: [{ id: "p2", position: "" }],
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
      ],
    },
  },
  sets: [
    {
      options: { serve: "home" },
      startingLineups: lineups,
      lineups,
      entries,
    },
  ],
});

const renderPanel = async (game: ReturnType<typeof gameWith>) => {
  server.use(http.get("/api/games/game-1", () => HttpResponse.json(game)));
  const store = makeStore();
  store.dispatch(gameActions.initialize({ game: game as never, setIndex: 0 }));
  store.dispatch(gameActions.setEntryDraftPlayer({ id: "p1", zone: 1 }));
  store.dispatch(gameActions.setEntryDraftSubstitution("p2"));
  render(
    <SwrIsolation>
      <Provider store={store}>
        <PendingWritesOwner>
          <Substitutes gameId="game-1" mode="general" />
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
      gameWith([
        {
          type: EntryType.SUBSTITUTION,
          id: "earlier",
          seq: 0,
          team: Side.HOME,
          players: { in: "p2", out: "p1" },
        },
      ]),
    );

    await userEvent.click(screen.getByRole("button", { name: /確認/ }));

    expect(await screen.findByText("換人與目前陣容不符")).toBeInTheDocument();
    expect(puts).toHaveLength(0);
  });
});
