import Game from "@/components/game";
import { GameOptions } from "@/components/game/options";
import { Dialog } from "@/components/ui/dialog";
import { EntryType } from "@/entities/game";
import { makeStore } from "@/lib/redux/store";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { SWRConfig } from "swr";
import { createGame } from "@test/support/fixtures/entities";

jest.mock("@/components/game/header", () => ({ GameHeader: () => null }));
jest.mock("@/components/game/options/summary", () => ({
  GameOptionsSummary: () => null,
}));
jest.mock("@/components/game/stats", () => ({ StatsForOneSet: () => null }));
jest.mock("@/components/game/unconfirmed-set-dialog", () => ({
  UnconfirmedSetDialog: () => null,
}));
jest.mock("@/components/game/set-options", () => {
  return {
    SetOptions: ({ setIndex }: { setIndex: number }) => (
      <output aria-label="new set index">{String(setIndex)}</output>
    ),
  };
});
jest.mock("@/hooks/use-pending-writes", () => ({
  ...jest.requireActual("@/hooks/use-pending-writes"),
  usePendingWrites: () => ({
    enqueue: jest.fn(),
    flush: async () => ({ ok: true }),
    retry: async () => ({ ok: true }),
  }),
}));

describe("GameOptions", () => {
  // The play-by-play list moved to the summary drawer; a tab for it here would
  // resurrect a second, diverging entry point.
  it("exposes only the overview and settings tabs", () => {
    render(
      <Provider store={makeStore()}>
        <Dialog open>
          <GameOptions
            gameId="game-1"
            tabValue="overview"
            setTabValue={() => {}}
          />
        </Dialog>
      </Provider>,
    );

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "總覽",
      "設定",
    ]);
  });

  it("uses set count rather than viewed set index for new sets", async () => {
    const user = userEvent.setup();
    const fixture = createGame();
    const completedSet = {
      ...fixture.sets[0]!,
      win: true,
      entries: fixture.sets[0]!.entries.map((entry) =>
        entry.type === EntryType.RALLY
          ? {
              ...entry,
              home: { ...entry.home, score: 25 },
              away: { ...entry.away, score: 20 },
            }
          : entry,
      ),
    };
    const game = createGame({
      sets: [completedSet, { ...completedSet, win: null, entries: [] }],
    });
    const store = makeStore();
    render(
      <SWRConfig
        value={{
          provider: () =>
            new Map([["/api/games/game-1", { data: game }]]) as never,
          dedupingInterval: 0,
        }}
      >
        <Provider store={store}>
          <Game gameId="game-1" setIndex={0} />
        </Provider>
      </SWRConfig>,
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "新的一局" })).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "新的一局" }));

    expect(await screen.findByLabelText("new set index")).toHaveTextContent(
      "2",
    );
  });
});
