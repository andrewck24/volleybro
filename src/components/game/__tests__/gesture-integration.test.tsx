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

    // Real submit persisted the entry: the drawer's committed row count grew
    // once expanded, and the drawer never opened from this tap.
    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "idle",
    );
    await user.click(screen.getByTestId("summary-drawer-handle"));
    expect(screen.getAllByTestId("summary-drawer-row")).toHaveLength(2);
    expect(
      screen.queryByTestId("summary-drawer-draft-row"),
    ).not.toBeInTheDocument();
  });

  it("in-progress Preview tap with incomplete steps does nothing", async () => {
    const user = userEvent.setup();
    const { store } = setUpGame();

    await screen.findByTestId("preview-trigger");
    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
    });

    await user.click(screen.getByTestId("preview-trigger"));

    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "idle",
    );
    await user.click(screen.getByTestId("summary-drawer-handle"));
    // Nothing was submitted: still only the one pre-existing committed entry,
    // shown as the draft's pulsing first row since input is still in progress.
    expect(screen.getAllByTestId("summary-drawer-row")).toHaveLength(1);
    expect(screen.getByTestId("summary-drawer-draft-row")).toBeInTheDocument();
  });

  it("handle toggles the drawer regardless of input progress state", async () => {
    const user = userEvent.setup();
    const { store } = setUpGame();

    await screen.findByTestId("preview-trigger");
    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
    });

    await user.click(screen.getByTestId("summary-drawer-handle"));

    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "expanded",
    );
    // The in-progress draft occupies the pulsing first row, distinct from
    // committed rows (D12 scenario "Handle expands drawer during input with
    // draft in first row").
    const draftRow = screen.getByTestId("summary-drawer-draft-row");
    expect(draftRow).toHaveClass("animate-pulse");

    await user.click(screen.getByTestId("summary-drawer-handle"));
    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "idle",
    );
  });

  it("freezes the draft into the formal first committed row on submit", async () => {
    const user = userEvent.setup();
    const { store } = setUpGame();

    await screen.findByTestId("preview-trigger");
    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]));
    });

    await user.click(screen.getByTestId("summary-drawer-handle"));
    expect(screen.getByTestId("summary-drawer-draft-row")).toBeInTheDocument();

    await user.click(screen.getByTestId("preview-trigger"));

    // The draft row is gone; the newly committed entry (drafted by #7) is now
    // the formal first row, in place.
    expect(
      screen.queryByTestId("summary-drawer-draft-row"),
    ).not.toBeInTheDocument();
    const rows = screen.getAllByTestId("summary-drawer-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("7");
  });
});
