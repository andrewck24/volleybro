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
jest.mock("@/hooks/use-data", () => ({
  useGame: () => ({ game: currentMockGame, mutate: jest.fn() }),
}));

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
    // next idle tap on the Preview expands the drawer -- confirming the
    // committed row count grew and no draft row remains.
    await user.click(screen.getByTestId("preview-trigger"));
    const rows = screen.getAllByTestId("summary-drawer-row");
    expect(rows).toHaveLength(2);
    // Freezes into the formal first committed row, newest-first (drafted by
    // #7).
    expect(rows[0]).toHaveTextContent("7");
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

    // Nothing was submitted: still only the one pre-existing committed entry,
    // shown as the draft's pulsing first row since input is still in
    // progress (D12 scenario "Handle expands drawer during input with draft
    // in first row").
    expect(screen.getAllByTestId("summary-drawer-row")).toHaveLength(1);
    const draftRow = screen.getByTestId("summary-drawer-draft-row");
    expect(draftRow).toHaveClass("animate-pulse");

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
