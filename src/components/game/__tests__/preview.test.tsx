import { GamePreview } from "@/components/game/preview";
import { EntryType, MoveType } from "@/entities/game";
import { gameActions } from "@/lib/features/game/game-slice";
import { makeStore } from "@/lib/redux/store";
import { scoringMoves } from "@/lib/scoring-moves";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";

// The previous (already committed) entry: home player #4 scored, 1-0.
const mockGame = {
  info: { scoring: { setCount: 3, decidingSetPoints: 15 } },
  teams: {
    home: {
      players: [
        { id: "p1", number: 4 },
        { id: "p2", number: 7 },
      ],
    },
  },
  sets: [
    {
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
};

// Mutable override so a single test can swap in a different game (e.g. the
// empty-entries case) without disturbing the shared mockGame the rest use.
let mockGameOverride: typeof mockGame | null = null;

jest.mock("@/hooks/use-data", () => ({
  useGame: () => ({ game: mockGameOverride ?? mockGame, mutate: jest.fn() }),
}));

afterEach(() => {
  mockGameOverride = null;
});

const SEND_LABEL = "送出";

const setUpPreview = (
  onSubmit = jest.fn(),
  onExpandDrawer: (() => void) | undefined = jest.fn(),
) => {
  const store = makeStore();
  act(() => {
    store.dispatch(
      gameActions.initialize({ game: mockGame as never, setIndex: 0 }),
    );
  });
  render(
    <Provider store={store}>
      <GamePreview
        gameId="game-1"
        mode="general"
        onSubmit={onSubmit}
        onExpandDrawer={onExpandDrawer}
      />
    </Provider>,
  );
  return { store, onSubmit, onExpandDrawer };
};

describe("GamePreview send affordance", () => {
  it("does not show the ring/send icon while a step is incomplete", () => {
    const { store } = setUpPreview();

    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
    });

    expect(
      screen.queryByRole("img", { name: SEND_LABEL }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("preview-trigger")).toHaveClass("animate-pulse");
  });

  it("shows the ring/send icon once every step is complete", () => {
    const { store } = setUpPreview();

    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
    });

    expect(screen.getByRole("img", { name: SEND_LABEL })).toBeInTheDocument();
  });
});

describe("GamePreview submission", () => {
  it("freezes and demotes the draft to the previous entry on submit", async () => {
    const user = userEvent.setup();
    const { store, onSubmit } = setUpPreview();

    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
    });

    // Draft in progress shows the drafting player's number (#7).
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: SEND_LABEL })).toBeInTheDocument();

    await user.click(screen.getByTestId("preview-trigger"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    // Demoted in place: the previous entry's player (#4) is shown instead of
    // the (still-pending) draft's player (#7), and the send affordance drops.
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.queryByText("7")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: SEND_LABEL }),
    ).not.toBeInTheDocument();
  });
});

// At entryIndex 0 with an empty draft there is no entry to preview (no draft
// and no prior entry), so the hook reports "not in progress" and GamePreview
// renders nothing instead of handing an undefined entry to <Entry>.
describe("GamePreview empty-entries guard", () => {
  it("renders nothing when the entry would be undefined (entryIndex 0, no draft)", () => {
    mockGameOverride = {
      ...mockGame,
      sets: [{ entries: [], options: { serve: "home" } }],
    } as unknown as typeof mockGame;
    const store = makeStore();
    act(() => {
      store.dispatch(
        gameActions.initialize({
          game: mockGameOverride as never,
          setIndex: 0,
        }),
      );
    });

    render(
      <Provider store={store}>
        <GamePreview gameId="game-1" mode="general" />
      </Provider>,
    );

    expect(screen.queryByTestId("preview-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("preview-trigger")).not.toBeInTheDocument();
  });

  // End-to-end crash path: with no committed entries, freezing a complete draft
  // on submit leaves `previousEntry` undefined. Freezing must fall back to the
  // draft entry itself (previousEntry ?? entry) rather than feed undefined to
  // <Entry> and white-screen the Game tree.
  it("does not throw when freezing the first entry (no previous entry)", async () => {
    mockGameOverride = {
      ...mockGame,
      sets: [{ entries: [], options: { serve: "home" } }],
    } as unknown as typeof mockGame;
    const user = userEvent.setup();
    const store = makeStore();
    act(() => {
      store.dispatch(
        gameActions.initialize({
          game: mockGameOverride as never,
          setIndex: 0,
        }),
      );
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
    });

    const onSubmit = jest.fn();
    render(
      <Provider store={store}>
        <GamePreview gameId="game-1" mode="general" onSubmit={onSubmit} />
      </Provider>,
    );

    await user.click(screen.getByTestId("preview-trigger"));

    // Submission fired and the frozen card still renders the draft entry (#7)
    // instead of crashing on an undefined previous entry.
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: SEND_LABEL }),
    ).not.toBeInTheDocument();
  });
});

describe("GamePreview gesture split", () => {
  it("expands the drawer on tap while idle (no draft in progress)", async () => {
    const user = userEvent.setup();
    const { onExpandDrawer, onSubmit } = setUpPreview();

    // entryIndex 0 with no player/type selected yet: not editing.
    await user.click(screen.getByTestId("preview-trigger"));

    expect(onExpandDrawer).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits and does not expand the drawer when in progress and complete", async () => {
    const user = userEvent.setup();
    const { store, onExpandDrawer, onSubmit } = setUpPreview();

    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
    });

    await user.click(screen.getByTestId("preview-trigger"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onExpandDrawer).not.toHaveBeenCalled();
  });

  it("does nothing (no submit, no expand) when in progress and incomplete", async () => {
    const user = userEvent.setup();
    const { store, onExpandDrawer, onSubmit } = setUpPreview();

    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
    });

    await user.click(screen.getByTestId("preview-trigger"));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onExpandDrawer).not.toHaveBeenCalled();
  });
});
