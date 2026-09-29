import { UnconfirmedSetDialog } from "@/components/game/unconfirmed-set-dialog";
import { ERROR_MESSAGES } from "@/lib/api/error-messages";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { setCompletionActions } from "@/lib/features/game/set-completion-slice";
import type { GameView } from "@/lib/features/game/types";
import { makeStore, type AppStore } from "@/lib/redux/store";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Provider } from "react-redux";
import { SWRConfig } from "swr";

import { server } from "../../../../test/msw/server";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const { type: _type, ...pendingRally } = {
  type: "Rally",
  id: "e1",
  seq: 0,
  win: true,
  home: { score: 25, type: 2, num: 0 },
  away: { score: 20, type: 2, num: 0 },
};
const lastRally = { type: "Rally", ...pendingRally };

const gameWithSet = (win: boolean | null): GameView =>
  ({ id: "game-1", sets: [{ win, entries: [lastRally] }] }) as never;

let store: AppStore;
const renderDialog = (game: GameView) =>
  render(
    <Provider store={store}>
      <SWRConfig
        value={{
          provider: () =>
            new Map([["/api/games/game-1", { data: game }]]) as never,
          dedupingInterval: 0,
        }}
      >
        <UnconfirmedSetDialog gameId="game-1" setIndex={0} />
      </SWRConfig>
    </Provider>,
  );

beforeEach(() => {
  store = makeStore();
});

describe("UnconfirmedSetDialog", () => {
  it("renders nothing once the set result is confirmed", () => {
    store.dispatch(
      setCompletionActions.recorded({
        gameId: "game-1",
        setIndex: 0,
        confirmed: true,
      }),
    );

    renderDialog(gameWithSet(true));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the neutral attempting state while the initial write is in flight", () => {
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: pendingRally as never,
        gameId: "game-1",
        setIndex: 0,
      }),
    );

    renderDialog(gameWithSet(true));

    expect(screen.getAllByText("正在記錄本局結果…").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: "重試" }),
    ).not.toBeInTheDocument();
  });

  it("shows the error voice and a retry button once attempts are exhausted", () => {
    store.dispatch(
      setCompletionActions.recorded({
        gameId: "game-1",
        setIndex: 0,
        confirmed: false,
      }),
    );

    renderDialog(gameWithSet(true));

    expect(
      screen.getAllByText(ERROR_MESSAGES.SERVER_ERROR.title).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "重試" })).toBeInTheDocument();
  });

  it("shows the same dialog on a cold start, detected from the fetched win alone", () => {
    renderDialog(gameWithSet(null));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重試" })).toBeInTheDocument();
  });

  it("has no close button", () => {
    renderDialog(gameWithSet(null));

    expect(
      screen.queryByRole("button", { name: "關閉" }),
    ).not.toBeInTheDocument();
  });

  it("retrying resends the last rally entry and closes the dialog on success", async () => {
    const user = userEvent.setup();
    let sent: unknown;
    let url!: URL;
    server.use(
      http.put("/api/games/game-1/sets/rallies", async ({ request }) => {
        url = new URL(request.url);
        sent = await request.json();
        return HttpResponse.json({
          entries: [lastRally],
          setCompletionConfirmed: true,
        });
      }),
    );
    store.dispatch(
      setCompletionActions.recorded({
        gameId: "game-1",
        setIndex: 0,
        confirmed: false,
      }),
    );

    renderDialog(gameWithSet(true));
    await user.click(screen.getByRole("button", { name: "重試" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(url.searchParams.get("si")).toBe("0");
    expect(sent).toEqual([pendingRally]);
  });
});
