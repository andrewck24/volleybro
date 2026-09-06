import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { SWRConfig } from "swr";
import { SummaryDrawer } from "@/components/game/summary-drawer";
import { EntryType, MoveType } from "@/entities/game";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import type { GameView, PendingEntry } from "@/lib/features/game/types";
import { makeStore, type AppStore } from "@/lib/redux/store";

const rally = (id: string, seq: number, score: number) => ({
  id,
  seq,
  win: true,
  home: {
    score,
    type: MoveType.SERVING,
    num: 0,
    player: { id: "p1", zone: 1 },
  },
  away: { score: 0 },
});

const game: GameView = {
  id: "game-1",
  win: null,
  teamId: "team-1",
  info: { scoring: { setCount: 5, decidingSetPoints: 15 } },
  teams: {
    home: {
      id: "t1",
      name: "Home",
      players: [{ id: "p1", name: "一", number: 4 }],
    },
    away: { id: "t2", name: "Away", players: [] },
  },
  sets: [
    {
      win: null,
      lineups: { home: { starting: [], substitutes: [], liberos: [] } },
      options: { serve: "home" },
      entries: [{ type: EntryType.RALLY, ...rally("server-1", 0, 1) }],
    },
  ],
} as never;

const permanentFailure = {
  code: "VALIDATION",
  reason: "BAD_REQUEST",
  status: 400,
};

// Mocks neither SWR nor Redux, against the Component row of
// docs/testing-strategy.md: the seam under test is the join between them.
it("marks a queued rally the server rejected, on a row only the merge provides", async () => {
  const store: AppStore = makeStore();
  store.dispatch(
    pendingWritesActions.enqueued({
      entry: rally("queued-1", 1, 2) as PendingEntry["entry"],
      gameId: "game-1",
      setIndex: 0,
    }),
  );
  store.dispatch(
    pendingWritesActions.flushFailed({
      ids: ["queued-1"],
      retryable: false,
      lastError: permanentFailure as never,
    }),
  );

  render(
    <Provider store={store}>
      <SWRConfig
        value={{
          provider: () =>
            new Map([["/api/games/game-1", { data: game }]]) as never,
          fetcher: async () => game,
        }}
      >
        <SummaryDrawer gameId="game-1" state="expanded" />
      </SWRConfig>
    </Provider>,
  );

  await waitFor(() =>
    expect(screen.getAllByTestId("entry-row-retry")).toHaveLength(1),
  );
});
