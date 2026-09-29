import {
  SummaryDrawer,
  SummaryDrawerCard,
  type IndexedEntry,
  type SummaryDrawerPreview,
} from "@/components/game/summary-drawer";
import { EntryType, MoveType } from "@/entities/game";
import { gameActions } from "@/lib/features/game/game-slice";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import type { EntryView, GamePlayerView } from "@/lib/features/game/types";
import { makeStore, type AppStore } from "@/lib/redux/store";
import { scoringMoves } from "@/lib/scoring-moves";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { SWRConfig } from "swr";

const players: GamePlayerView[] = [
  { id: "p1", name: "選手一", number: 4 },
  { id: "p2", name: "選手二", number: 7 },
];

let entryIdSeq = 0;
const makeEntry = (homeScore: number, playerId: string): EntryView =>
  ({
    id: `entry-${(entryIdSeq += 1)}`,
    type: EntryType.RALLY,
    win: true,
    home: {
      score: homeScore,
      type: MoveType.SERVING,
      num: 0,
      player: { id: playerId, zone: 1 },
    },
    away: { score: 0, type: MoveType.SERVING, num: 1 },
  }) as unknown as EntryView;

// Three committed entries, chronologically increasing score; entries[2] (score
// 3, player #7) is the latest.
const allEntries = [makeEntry(1, "p1"), makeEntry(2, "p1"), makeEntry(3, "p2")];
const indexed = (entries: EntryView[]): IndexedEntry[] =>
  entries.map((entry, index) => ({ entry, index }));

// The Preview bar is only present while recording an uncommitted draft.
const makePreview = (
  overrides: Partial<SummaryDrawerPreview> = {},
): SummaryDrawerPreview => ({
  entry: allEntries[2]!,
  previousEntry: allEntries[1],
  players,
  isEditing: true,
  isComplete: false,
  entryIndex: 3,
  ...overrides,
});

const baseProps = {
  entries: indexed(allEntries),
  totalEntries: allEntries.length,
  players,
};

describe("SummaryDrawerCard structure", () => {
  it("idle peek renders only the single newest committed entry (no separate Preview bar)", async () => {
    render(<SummaryDrawerCard {...baseProps} state="idle" />);

    const drawer = await screen.findByTestId("summary-drawer");
    expect(drawer).toHaveAttribute("data-state", "idle");
    expect(screen.getByTestId("summary-drawer-handle")).toBeInTheDocument();
    // Collapsed peek shows ONLY the top row (natural whitespace below it), not
    // the whole clipped list. The newest entry is player #7 (allEntries[2]).
    const rows = screen.getAllByTestId("summary-drawer-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("7");
    expect(screen.queryByTestId("preview-card")).not.toBeInTheDocument();
  });

  it("expanded renders every committed entry as a row", async () => {
    render(<SummaryDrawerCard {...baseProps} state="expanded" />);

    expect(await screen.findByTestId("summary-drawer")).toBeInTheDocument();
    expect(screen.getAllByTestId("summary-drawer-row")).toHaveLength(3);
  });

  it("recording collapsed shows only the draft Preview bar; expanded shows it above the full list", async () => {
    const { rerender } = render(
      <SummaryDrawerCard {...baseProps} state="idle" preview={makePreview()} />,
    );

    // Collapsed + recording: the peek is just the pulsing draft, no committed rows.
    expect(await screen.findByTestId("preview-card")).toBeInTheDocument();
    expect(screen.queryByTestId("summary-drawer-row")).not.toBeInTheDocument();

    // Expanded: the draft Preview sits above every committed entry.
    rerender(
      <SummaryDrawerCard
        {...baseProps}
        state="expanded"
        preview={makePreview()}
      />,
    );
    expect(screen.getByTestId("preview-card")).toBeInTheDocument();
    expect(screen.getAllByTestId("summary-drawer-row")).toHaveLength(3);
  });

  it("handles an empty committed list without crashing", async () => {
    render(<SummaryDrawerCard {...baseProps} entries={[]} state="idle" />);

    expect(await screen.findByTestId("summary-drawer")).toBeInTheDocument();
    expect(screen.queryByTestId("summary-drawer-row")).not.toBeInTheDocument();
  });
});

describe("SummaryDrawerCard handle / expansion", () => {
  it("clicking the handle calls onToggle", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(
      <SummaryDrawerCard {...baseProps} state="idle" onToggle={onToggle} />,
    );

    await user.click(await screen.findByTestId("summary-drawer-handle"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("collapsed peek: tapping a row expands the drawer instead of inline-expanding", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(
      <SummaryDrawerCard {...baseProps} state="idle" onToggle={onToggle} />,
    );

    const rows = await screen.findAllByTestId("entry-row");
    await user.click(rows[0]!);

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(rows[0]).toHaveAttribute("data-expanded", "false");
  });

  it("expanded: tapping a row inline-expands it, and tapping another collapses the first (single-open)", async () => {
    const user = userEvent.setup();
    render(<SummaryDrawerCard {...baseProps} state="expanded" />);

    const rows = await screen.findAllByTestId("entry-row");
    await user.click(rows[0]!);
    expect(rows[0]).toHaveAttribute("data-expanded", "true");

    await user.click(rows[1]!);
    expect(rows[0]).toHaveAttribute("data-expanded", "false");
    expect(rows[1]).toHaveAttribute("data-expanded", "true");
  });
});

describe("SummaryDrawerCard backdrop overlay", () => {
  it("expanded: tapping the backdrop collapses the drawer", () => {
    const onToggle = jest.fn();
    render(
      <SummaryDrawerCard {...baseProps} state="expanded" onToggle={onToggle} />,
    );

    // fireEvent (not userEvent): userEvent's pointer-events check flakes when a
    // prior suite's radix modal leaves document.body with pointer-events:none,
    // which this out-of-portal overlay would inherit.
    fireEvent.click(screen.getByTestId("summary-drawer-overlay"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

// `entry-ui` change's gesture split, exercised through the draft Preview bar
// (present only while recording). PreviewCard's own tap-handling is covered
// in preview.test.tsx.
describe("SummaryDrawerCard Preview bar wiring (recording)", () => {
  it("tapping the Preview bar while editing and complete calls onSubmit, not onToggle", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    const onSubmit = jest.fn();
    render(
      <SummaryDrawerCard
        {...baseProps}
        state="idle"
        preview={makePreview({ isEditing: true, isComplete: true })}
        onToggle={onToggle}
        onSubmit={onSubmit}
      />,
    );

    await user.click(await screen.findByTestId("preview-trigger"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("tapping the Preview bar while editing and incomplete does nothing", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    const onSubmit = jest.fn();
    render(
      <SummaryDrawerCard
        {...baseProps}
        state="idle"
        preview={makePreview({ isEditing: true, isComplete: false })}
        onToggle={onToggle}
        onSubmit={onSubmit}
      />,
    );

    await user.click(await screen.findByTestId("preview-trigger"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onToggle).not.toHaveBeenCalled();
  });
});

// S08: a rally whose write exhausted its attempts is marked on its row,
// matched by identity, with a way to retry it -- consuming hasFailedWrite
// rather than storing status of its own.
describe("SummaryDrawerCard failed-write marking", () => {
  it("marks only the row whose id is in failedEntryIds and wires its retry", async () => {
    const user = userEvent.setup();
    const onEntryRetry = jest.fn();
    const failedId = allEntries[1]!.id;
    render(
      <SummaryDrawerCard
        {...baseProps}
        state="expanded"
        failedEntryIds={new Set([failedId])}
        onEntryRetry={onEntryRetry}
      />,
    );

    const retryControls = screen.getAllByTestId("entry-row-retry");
    expect(retryControls).toHaveLength(1);

    await user.click(retryControls[0]!);
    expect(onEntryRetry).toHaveBeenCalledTimes(1);
  });

  it("shows no retry control when nothing has failed", () => {
    render(<SummaryDrawerCard {...baseProps} state="expanded" />);

    expect(screen.queryByTestId("entry-row-retry")).not.toBeInTheDocument();
  });
});

const serverGame = {
  id: "game-1",
  info: { scoring: { setCount: 3, decidingSetPoints: 15 } },
  sets: [{ options: { serve: "home" }, entries: allEntries }],
  teams: { home: { players } },
};

const renderDrawer = (store: AppStore, ui: React.ReactNode) =>
  render(
    <Provider store={store}>
      <SWRConfig
        value={{
          provider: () =>
            new Map([["/api/games/game-1", { data: serverGame }]]) as never,
          dedupingInterval: 0,
        }}
      >
        {ui}
      </SWRConfig>
    </Provider>,
  );

const initializedStore = () => {
  const store = makeStore();
  act(() => {
    store.dispatch(
      gameActions.initialize({ game: serverGame as never, setIndex: 0 }),
    );
  });
  return store;
};

// The Summary drawer's edit action must both flip Redux to "editing" AND
// signal the Game shell to open the Options dialog (onEditRequest). Without the
// second call, edit is a visible no-op.
describe("SummaryDrawer", () => {
  it("marks the failed row from the pending-write queue and forwards a retry tap", async () => {
    const user = userEvent.setup();
    const onEntryRetry = jest.fn();
    const store = makeStore();
    act(() => {
      store.dispatch(
        pendingWritesActions.enqueued({
          entry: allEntries[1] as never,
          gameId: "game-1",
          setIndex: 0,
        }),
      );
      // A 4xx: nothing will send this entry, which is what the row's marker is for.
      store.dispatch(
        pendingWritesActions.flushFailed({
          ids: [allEntries[1]!.id],
          retryable: false,
          lastError: { code: "VALIDATION", reason: "BAD_REQUEST", status: 400 },
        }),
      );
    });
    renderDrawer(
      store,
      <SummaryDrawer
        gameId="game-1"
        state="expanded"
        onEntryRetry={onEntryRetry}
      />,
    );

    const retryControls = await screen.findAllByTestId("entry-row-retry");
    expect(retryControls).toHaveLength(1);

    await user.click(retryControls[0]!);
    expect(onEntryRetry).toHaveBeenCalledTimes(1);
  });

  it("editing an entry row switches the store to editing that entry and fires onEditRequest", async () => {
    const onEditRequest = jest.fn();
    const store = initializedStore();
    renderDrawer(
      store,
      <SummaryDrawer
        gameId="game-1"
        state="expanded"
        onEditRequest={onEditRequest}
      />,
    );

    // Expanded renders every committed row; the newest row is first.
    const editButtons = await screen.findAllByTestId("entry-action-edit");
    fireEvent.click(editButtons[0]!);

    expect(store.getState().game.mode).toBe("editing");
    expect(store.getState().game.editing.entryDraft.id).toBe(allEntries[2]!.id);
    expect(onEditRequest).toHaveBeenCalledTimes(1);
  });

  it("toggles between the idle peek and the expanded sheet on its own: handle expands, Escape collapses", async () => {
    const user = userEvent.setup();
    renderDrawer(initializedStore(), <SummaryDrawer gameId="game-1" />);

    const drawer = await screen.findByTestId("summary-drawer");
    expect(drawer).toHaveAttribute("data-state", "idle");
    expect(screen.getAllByTestId("summary-drawer-row")).toHaveLength(1);

    await user.click(screen.getByTestId("summary-drawer-handle"));
    expect(drawer).toHaveAttribute("data-state", "expanded");
    expect(screen.getAllByTestId("summary-drawer-row")).toHaveLength(3);

    await user.keyboard("{Escape}");
    expect(drawer).toHaveAttribute("data-state", "idle");
  });

  it("shows the in-progress draft as the Preview above the committed rows, and a tap on it submits when complete", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const store = initializedStore();
    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
    });
    renderDrawer(
      store,
      <SummaryDrawer gameId="game-1" state="expanded" onSubmit={onSubmit} />,
    );

    expect(await screen.findByTestId("preview-card")).toBeInTheDocument();
    expect(screen.getAllByTestId("summary-drawer-row")).toHaveLength(3);

    await user.click(screen.getByTestId("preview-trigger"));
    expect(onSubmit).not.toHaveBeenCalled();

    act(() => {
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
    });
    await user.click(screen.getByTestId("preview-trigger"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
