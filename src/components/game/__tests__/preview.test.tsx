import { GamePreview } from "@/components/game/preview";
import { EntryType, MoveType } from "@/entities/game";
import {
  PendingWritesContext,
  usePendingWrites,
} from "@/hooks/use-pending-writes";
import { gameActions } from "@/lib/features/game/game-slice";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { makeStore } from "@/lib/redux/store";
import { scoringMoves } from "@/lib/scoring-moves";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";

// GamePreview reads enqueue/flush/retry from context now that `usePendingWrites`
// mounts once in `Game` -- this harness stands in for that single owner so
// GamePreview can still be rendered on its own here.
const PendingWritesTestHarness = ({
  gameId,
  setIndex,
  children,
}: {
  gameId: string;
  setIndex: number;
  children: React.ReactNode;
}) => {
  const pendingWrites = usePendingWrites(gameId, setIndex);
  return (
    <PendingWritesContext.Provider value={pendingWrites}>
      {children}
    </PendingWritesContext.Provider>
  );
};

// Only the editing-write-status suite below exercises a real flush (via
// usePendingWrites -> GamePreview's retry); every other suite in this file
// never enqueues anything, so the queue stays empty and apiClient is unused.
jest.mock("@/lib/api/api-client", () => ({
  ...jest.requireActual("@/lib/api/api-client"),
  apiClient: jest.fn().mockResolvedValue({ entries: [{ id: "e1" }] }),
}));

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
      options: { serve: "home" },
      entries: [
        {
          id: "e1",
          seq: 0,
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
      <PendingWritesTestHarness gameId="game-1" setIndex={0}>
        <GamePreview
          gameId="game-1"
          mode="general"
          onSubmit={onSubmit}
          onExpandDrawer={onExpandDrawer}
        />
      </PendingWritesTestHarness>
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
        <PendingWritesTestHarness gameId="game-1" setIndex={0}>
          <GamePreview gameId="game-1" mode="general" />
        </PendingWritesTestHarness>
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
        <PendingWritesTestHarness gameId="game-1" setIndex={0}>
          <GamePreview gameId="game-1" mode="general" onSubmit={onSubmit} />
        </PendingWritesTestHarness>
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

// S08: the update path doesn't advance optimistically, so unlike create it
// keeps showing progress and failure on this card -- pure projections of the
// same pending-write queue SyncIndicator reads, scoped to the edited entry's
// identity (e1, from mockGame).
describe("GamePreview editing write status", () => {
  const setUpEditing = () => {
    const store = makeStore();
    act(() => {
      store.dispatch(
        gameActions.initialize({ game: mockGame as never, setIndex: 0 }),
      );
      store.dispatch(
        gameActions.setEditingEntryStatus({
          game: mockGame as never,
          entryIndex: 0,
        }),
      );
    });
    const onSubmit = jest.fn();
    render(
      <Provider store={store}>
        <PendingWritesTestHarness gameId="game-1" setIndex={0}>
          <GamePreview gameId="game-1" mode="editing" onSubmit={onSubmit} />
        </PendingWritesTestHarness>
      </Provider>,
    );
    return { store, onSubmit };
  };

  it("shows a progress indicator instead of the send affordance while the write is scheduled, and ignores taps", async () => {
    const user = userEvent.setup();
    const { store, onSubmit } = setUpEditing();

    act(() => {
      store.dispatch(
        pendingWritesActions.enqueued({
          entry: { id: "e1", seq: 0, win: true, home: {}, away: {} } as never,
          gameId: "game-1",
          setIndex: 0,
        }),
      );
      // Schedule its next attempt seconds out (the real background-backoff
      // shape) so this test's click doesn't race the background-retry
      // effect's own near-immediate flush of a freshly-enqueued entry.
      store.dispatch(
        pendingWritesActions.flushFailed({
          gameId: "game-1",
          ids: ["e1"],
          retryable: true,
        }),
      );
    });

    expect(screen.getByRole("status", { name: "送出中" })).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: SEND_LABEL }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByTestId("preview-trigger"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the failed ring and a retry control once attempts are exhausted, and retry re-schedules the entry", async () => {
    const user = userEvent.setup();
    const { store } = setUpEditing();

    act(() => {
      store.dispatch(
        pendingWritesActions.enqueued({
          entry: { id: "e1", seq: 0, win: true, home: {}, away: {} } as never,
          gameId: "game-1",
          setIndex: 0,
        }),
      );
      store.dispatch(
        pendingWritesActions.flushFailed({
          gameId: "game-1",
          ids: ["e1"],
          retryable: false,
        }),
      );
    });

    expect(store.getState().pendingWrites.pending[0]!.nextAttemptAt).toBeNull();
    const retry = screen.getByRole("button", { name: "重試" });

    await user.click(retry);

    // Same mechanism as SyncIndicator's retry: dispatches retryRequested and
    // flushes -- confirmed here by the queue actually clearing once that
    // flush succeeds, not by asserting on the dispatch call itself.
    await waitFor(() =>
      expect(store.getState().pendingWrites.pending).toHaveLength(0),
    );
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
