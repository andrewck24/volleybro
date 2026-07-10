import {
  SummaryDrawerCard,
  type IndexedEntry,
  type SummaryDrawerPreview,
} from "@/components/game/summary-drawer";
import { EntryType, MoveType } from "@/entities/game";
import type { EntryView, GamePlayerView } from "@/lib/features/game/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const players: GamePlayerView[] = [
  { id: "p1", name: "選手一", number: 4, stats: [] },
  { id: "p2", name: "選手二", number: 7, stats: [] },
];

const makeEntry = (homeScore: number, playerId: string): EntryView =>
  ({
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
// 3, player #7) is the latest. The card receives already-indexed entries (the
// container filters out the one the Preview occupies before passing them in).
const allEntries = [makeEntry(1, "p1"), makeEntry(2, "p1"), makeEntry(3, "p2")];
const indexed = (entries: EntryView[]): IndexedEntry[] =>
  entries.map((entry, index) => ({ entry, index }));

const makePreview = (
  overrides: Partial<SummaryDrawerPreview> = {},
): SummaryDrawerPreview => ({
  entry: allEntries[2],
  previousEntry: allEntries[1],
  players,
  isEditing: false,
  isComplete: false,
  entryIndex: 3,
  ...overrides,
});

describe("SummaryDrawerCard idle state", () => {
  it("shows the handle and the Preview bar, and no list rows", () => {
    render(
      <SummaryDrawerCard
        entries={indexed(allEntries)}
        totalEntries={allEntries.length}
        players={players}
        state="idle"
        preview={makePreview()}
      />,
    );

    // Idle peek exposes the handle at the top edge and the Preview beneath it.
    expect(screen.getByTestId("summary-drawer-handle")).toBeInTheDocument();
    expect(screen.getByTestId("preview-card")).toBeInTheDocument();
    expect(screen.queryByTestId("summary-drawer-row")).not.toBeInTheDocument();
  });

  it("renders the handle but no Preview bar when preview data is absent", () => {
    render(
      <SummaryDrawerCard
        entries={indexed(allEntries)}
        totalEntries={allEntries.length}
        players={players}
        state="idle"
      />,
    );

    expect(screen.getByTestId("summary-drawer-handle")).toBeInTheDocument();
    expect(screen.queryByTestId("preview-card")).not.toBeInTheDocument();
  });
});

describe("SummaryDrawerCard expanded state (bottom sheet)", () => {
  it("renders the given entries newest-first, marking the latest by totalEntries", () => {
    // The container has filtered out entries[2] (the one the Preview shows), so
    // the card only receives entries[0] and entries[1] -- no duplicate of the
    // Preview's row appears in the list.
    render(
      <SummaryDrawerCard
        entries={indexed(allEntries).slice(0, 2)}
        totalEntries={allEntries.length}
        players={players}
        state="expanded"
      />,
    );

    const rows = screen.getAllByTestId("summary-drawer-row");
    expect(rows).toHaveLength(2);
    // Newest-first: entries[1] (#4) precedes entries[0] (#4). The latest
    // entry (entries[2], #7) is NOT in the list -- it lives in the Preview.
    expect(rows[0]).toHaveTextContent("4");
    expect(rows[1]).toHaveTextContent("4");
    expect(screen.queryByText("7")).not.toBeInTheDocument();
  });

  it("handles an empty entry list without crashing", () => {
    render(
      <SummaryDrawerCard
        entries={[]}
        totalEntries={0}
        players={players}
        state="expanded"
      />,
    );

    expect(screen.queryByTestId("summary-drawer-row")).not.toBeInTheDocument();
  });
});

describe("SummaryDrawerCard handle / modal", () => {
  it("clicking the idle handle calls onToggle to expand", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(
      <SummaryDrawerCard
        entries={indexed(allEntries)}
        totalEntries={allEntries.length}
        players={players}
        state="idle"
        onToggle={onToggle}
      />,
    );

    await user.click(screen.getByTestId("summary-drawer-handle"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("expanded renders the modal, and closing it (Escape) calls onToggle", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(
      <SummaryDrawerCard
        entries={indexed(allEntries)}
        totalEntries={allEntries.length}
        players={players}
        state="expanded"
        onToggle={onToggle}
      />,
    );

    // The list lives in the vaul modal (portalled), not behind the inline peek.
    expect(
      await screen.findByTestId("summary-drawer-modal"),
    ).toBeInTheDocument();

    // The inline handle is inert behind the modal overlay; the modal closes via
    // its own affordances (Escape / overlay / drag), which fires onToggle.
    await user.keyboard("{Escape}");
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

// D8/D12 gesture split, exercised through SummaryDrawerCard's own wiring of
// the Preview bar (PreviewCard's tap-handling itself is covered in
// preview.test.tsx).
describe("SummaryDrawerCard Preview bar wiring", () => {
  const baseProps = {
    entries: indexed(allEntries),
    totalEntries: allEntries.length,
    players,
    state: "idle" as const,
  };

  it("tapping the Preview bar while idle (not editing) calls onToggle to expand", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(
      <SummaryDrawerCard
        {...baseProps}
        preview={makePreview({ isEditing: false })}
        onToggle={onToggle}
      />,
    );

    await user.click(screen.getByTestId("preview-trigger"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("tapping the Preview bar while editing and complete calls onSubmit, not onToggle", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    const onSubmit = jest.fn();
    render(
      <SummaryDrawerCard
        {...baseProps}
        preview={makePreview({ isEditing: true, isComplete: true })}
        onToggle={onToggle}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByTestId("preview-trigger"));
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
        preview={makePreview({ isEditing: true, isComplete: false })}
        onToggle={onToggle}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByTestId("preview-trigger"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("while editing, the Preview pulses in place instead of a separate draft row", () => {
    render(
      <SummaryDrawerCard
        {...baseProps}
        state="expanded"
        preview={makePreview({ isEditing: true, isComplete: false })}
      />,
    );

    // No separate draft row exists any more -- the pulsing draft IS the Preview.
    expect(
      screen.queryByTestId("summary-drawer-draft-row"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("preview-trigger")).toHaveClass("animate-pulse");
  });
});
