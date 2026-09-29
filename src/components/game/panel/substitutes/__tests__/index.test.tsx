import { Substitutes } from "@/components/game/panel/substitutes";
import { Toaster } from "@/components/ui/toaster";
import { gameActions } from "@/lib/features/game/game-slice";
import { makeStore } from "@/lib/redux/store";
import { SwrIsolation } from "@/test-utils/swr-isolation";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Provider } from "react-redux";

import { server } from "../../../../../../test/msw/server";

const game = {
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
      lineups: {
        home: {
          options: { liberoReplaceMode: 0, liberoReplacePosition: "" },
          starting: [{ id: "p1", position: "OH" }],
          liberos: [],
          substitutes: [{ id: "p2", position: "" }],
        },
      },
      entries: [],
    },
  ],
};

describe("Substitutes.onSubmit", () => {
  it("posts the substitution and tells the recorder when the write fails", async () => {
    let posted: { si: string | null; ei: string | null; body: unknown } | null =
      null;
    server.use(
      http.get("/api/games/game-1", () => HttpResponse.json(game)),
      http.post("/api/games/game-1/sets/substitutions", async ({ request }) => {
        const { searchParams } = new URL(request.url);
        posted = {
          si: searchParams.get("si"),
          ei: searchParams.get("ei"),
          body: await request.json(),
        };
        return HttpResponse.error();
      }),
    );
    const store = makeStore();
    store.dispatch(
      gameActions.initialize({ game: game as never, setIndex: 0 }),
    );
    store.dispatch(gameActions.setEntryDraftPlayer({ id: "p1", zone: 1 }));
    store.dispatch(gameActions.setEntryDraftSubstitution("p2"));
    render(
      <SwrIsolation>
        <Provider store={store}>
          <Substitutes gameId="game-1" mode="general" />
          <Toaster />
        </Provider>
      </SwrIsolation>,
    );
    // The candidate list is built from the loaded game.
    await screen.findByRole("button", { name: /選手二/ });

    await userEvent.click(screen.getByRole("button", { name: /確認/ }));

    expect(await screen.findByText("連線逾時")).toBeInTheDocument();
    expect(posted).toEqual({
      si: "0",
      ei: "0",
      body: expect.objectContaining({ players: { in: "p2", out: "p1" } }),
    });
  });
});
