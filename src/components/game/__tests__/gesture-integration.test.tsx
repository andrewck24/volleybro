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
  it("idle Preview tap expands the drawer", async () => {
    const user = userEvent.setup();
    const { store } = setUpGame();
    void store;

    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "idle",
    );

    await user.click(await screen.findByTestId("preview-trigger"));

    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "expanded",
    );
  });

  it("in-progress Preview tap with complete steps submits via the real dispatch path and does not expand", async () => {
    const user = userEvent.setup();
    const { store } = setUpGame();

    await screen.findByTestId("preview-trigger");
    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]));
    });

    await user.click(screen.getByTestId("preview-trigger"));

    // Real submit persisted the entry: the drawer never opened from this
    // tap (the draft is reset, so this tap only submits).
    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "idle",
    );

    // The draft is reset (no longer editing) after the real submit, so the
    // next idle tap on the Preview expands the drawer. The just-committed entry
    // (#7) is now the Preview's own row; the drawer list shows only the OTHER
    // committed entry (#4) -- the newest entry is never shown twice.
    await user.click(screen.getByTestId("preview-trigger"));
    const rows = await screen.findAllByTestId("summary-drawer-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("4");
    expect(screen.getByTestId("preview-card")).toHaveTextContent("7");
    expect(
      screen.queryByTestId("summary-drawer-draft-row"),
    ).not.toBeInTheDocument();
  });

  it("in-progress Preview tap with incomplete steps does nothing (no submit, no expand)", async () => {
    const user = userEvent.setup();
    const { store } = setUpGame();

    await screen.findByTestId("preview-trigger");
    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
    });

    await user.click(screen.getByTestId("preview-trigger"));

    // Editing + incomplete: the tap does nothing at all (D8/D12 gesture
    // split) -- the drawer stays idle since there is no way to expand it
    // while a draft is incomplete.
    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "idle",
    );
  });

  it("drawer stays expanded and shows the pulsing draft row while input is in progress", async () => {
    const user = userEvent.setup();
    const { store } = setUpGame();

    await screen.findByTestId("preview-trigger");
    // Idle tap (not editing yet) expands the drawer.
    await user.click(screen.getByTestId("preview-trigger"));
    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "expanded",
    );

    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
    });

    // Nothing was submitted. The in-progress draft is now the Preview itself,
    // pulsing in place (no separate draft row); the one pre-existing committed
    // entry (#4) stays in the list below (D12 scenario "Handle expands drawer
    // during input with draft in first row").
    expect(screen.getByTestId("preview-trigger")).toHaveClass("animate-pulse");
    expect(screen.getAllByTestId("summary-drawer-row")).toHaveLength(1);
    expect(
      screen.queryByTestId("summary-drawer-draft-row"),
    ).not.toBeInTheDocument();

    // The drawer's own close affordance toggles it back to idle regardless
    // of input progress.
    await user.click(screen.getByTestId("summary-drawer-handle"));
    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "idle",
    );
  });

  // Note: the freeze-on-submit behavior is covered above ("...submits via the
  // real dispatch path...") -- submitting while idle, then opening the sheet
  // afterwards to see the committed result.
});
