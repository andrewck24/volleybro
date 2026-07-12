import Game from "@/components/game";
import { EntryType, MoveType } from "@/entities/game";
import { gameActions } from "@/lib/features/game/game-slice";
import { makeStore } from "@/lib/redux/store";
import { scoringMoves } from "@/lib/scoring-moves";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";

// Capstone integration test (task group 6): exercises the real `Game`
// composition (src/components/game/index.tsx) so the gesture split, the
// onExpand -> drawer rewire, and the onSubmit -> real dispatch wiring are all
// verified together, not just their presentational pieces in isolation.
// Heavy sibling components (header/court/options/panel/stats) are stubbed
// out -- they are unrelated to the Preview<->drawer integration under test.
jest.mock("@/components/game/header", () => ({ GameHeader: () => null }));
jest.mock("@/components/game/court", () => ({ GameCourt: () => null }));
jest.mock("@/components/game/options", () => ({ GameOptions: () => null }));
jest.mock("@/components/game/options/summary", () => ({
  GameOptionsSummary: () => null,
}));
jest.mock("@/components/game/panel", () => ({ GamePanel: () => null }));
jest.mock("@/components/game/set-options", () => ({ SetOptions: () => null }));
jest.mock("@/components/game/stats", () => ({ StatsForOneSet: () => null }));

jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));
jest.mock("@/lib/api/error-toast", () => ({ showErrorToast: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentMockGame: any;
// mutate mirrors SWR's contract closely enough for the submit path: it awaits
// the passed mutation promise (so create/update's confirm-on-success timing is
// real) and swallows rejections the way rollbackOnError would.
jest.mock("@/hooks/use-data", () => ({
  useGame: () => ({
    game: currentMockGame,
    mutate: jest.fn(async (promise?: Promise<unknown>) => {
      try {
        return await promise;
      } catch {
        return undefined;
      }
    }),
  }),
}));

const originalFetch = global.fetch;
beforeEach(() => {
  // createRally/updateRally POST to the API; the helper already mutates the
  // mock game in place, so the response body is irrelevant -- only `ok` matters.
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => currentMockGame.sets[0].entries,
  })) as unknown as typeof fetch;
});

afterEach(() => {
  // Restore the real global so this file's fetch stub never leaks into other
  // suites sharing the worker (e.g. set-options' pending-state test).
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

const moveStats = () => ({
  [MoveType.SERVING]: { success: 0, error: 0 },
  [MoveType.RECEPTION]: { success: 0, error: 0 },
  [MoveType.ATTACK]: { success: 0, error: 0 },
  [MoveType.BLOCKING]: { success: 0, error: 0 },
  [MoveType.DEFENSE]: { success: 0, error: 0 },
  [MoveType.SETTING]: { success: 0, error: 0 },
});

const makeMockGame = () => ({
  id: "game-1",
  win: null,
  teamId: "team-1",
  info: { scoring: { setCount: 3, decidingSetPoints: 15 } },
  sets: [
    {
      win: null,
      options: { serve: "home" },
      entries: [
        {
          type: EntryType.RALLY,
          win: true,
          home: {
            score: 1,
            type: MoveType.SERVING,
            num: 0,
            player: { id: "p1", zone: 1 },
          },
          away: { score: 0, type: MoveType.SERVING, num: 1 },
        },
      ],
    },
  ],
  teams: {
    home: {
      id: "team-1",
      players: [
        { id: "p1", name: "選手一", number: 4, stats: [moveStats()] },
        { id: "p2", name: "選手二", number: 7, stats: [moveStats()] },
      ],
      staffs: [],
      stats: [
        {
          ...moveStats(),
          [MoveType.UNFORCED]: { success: 0, error: 0 },
          rotation: 0,
          timeout: 2,
          substitution: 6,
          challenge: 2,
        },
      ],
    },
    away: {
      id: "team-2",
      players: [],
      staffs: [],
      stats: [
        {
          ...moveStats(),
          [MoveType.UNFORCED]: { success: 0, error: 0 },
          rotation: 0,
          timeout: 2,
          substitution: 6,
          challenge: 2,
        },
      ],
    },
  },
});

const setUpGame = () => {
  currentMockGame = makeMockGame();
  const store = makeStore();
  render(
    <Provider store={store}>
      <Game gameId="game-1" setIndex={0} />
    </Provider>,
  );
  return { store };
};

describe("Game composition: gesture split integration (D8/D12)", () => {
  it("tapping the handle expands the drawer from the idle peek", async () => {
    const user = userEvent.setup();
    setUpGame();

    expect(await screen.findByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "idle",
    );
    // Idle (not recording) has no separate Preview bar -- the peek row is the
    // newest committed entry; the handle toggles the drawer.
    expect(screen.queryByTestId("preview-card")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("summary-drawer-handle"));

    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "expanded",
    );
  });

  it("in-progress Preview tap with complete steps submits via the real dispatch path and does not expand", async () => {
    const user = userEvent.setup();
    const { store } = setUpGame();

    await screen.findByTestId("summary-drawer");
    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]));
    });

    // Recording now: the draft Preview bar appears at the top of the drawer.
    await user.click(await screen.findByTestId("preview-trigger"));

    // Real submit persisted the entry; the drawer state is unchanged (idle).
    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "idle",
    );

    // The draft is reset (no longer recording), so there is no Preview bar; the
    // just-committed entry (#7) is simply the newest row. Expand via the handle
    // to see the full committed list, newest-first (#7 then the pre-existing
    // #4).
    await user.click(screen.getByTestId("summary-drawer-handle"));
    const rows = await screen.findAllByTestId("summary-drawer-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("7");
    expect(rows[1]).toHaveTextContent("4");
    expect(screen.queryByTestId("preview-card")).not.toBeInTheDocument();
  });

  it("in-progress Preview tap with incomplete steps does nothing (no submit, no expand)", async () => {
    const user = userEvent.setup();
    const { store } = setUpGame();

    await screen.findByTestId("summary-drawer");
    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
    });

    await user.click(await screen.findByTestId("preview-trigger"));

    // Editing + incomplete: the tap does nothing -- the drawer stays idle.
    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "idle",
    );
  });

  it("drawer stays expanded showing the pulsing draft Preview while input is in progress, and Escape collapses it", async () => {
    const user = userEvent.setup();
    const { store } = setUpGame();

    await screen.findByTestId("summary-drawer");
    // Expand from the peek via the handle.
    await user.click(screen.getByTestId("summary-drawer-handle"));
    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "expanded",
    );

    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
    });

    // The in-progress draft is the pulsing Preview bar (not a committed row);
    // the one pre-existing committed entry (#4) stays as a row below it.
    expect(await screen.findByTestId("preview-trigger")).toHaveClass(
      "animate-pulse",
    );
    expect(screen.getAllByTestId("summary-drawer-row")).toHaveLength(1);
    expect(
      screen.queryByTestId("summary-drawer-draft-row"),
    ).not.toBeInTheDocument();

    // Escape collapses the expanded sheet back to the peek (onOpenChange ->
    // collapse-to-peek), regardless of input progress.
    await user.keyboard("{Escape}");
    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "idle",
    );
  });
});
