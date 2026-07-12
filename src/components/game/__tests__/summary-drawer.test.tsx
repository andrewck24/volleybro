import {
  SummaryDrawerCard,
  type IndexedEntry,
  type SummaryDrawerPreview,
} from "@/components/game/summary-drawer";
import { EntryType, MoveType } from "@/entities/game";
import type { EntryView, GamePlayerView } from "@/lib/features/game/types";
import { fireEvent, render, screen } from "@testing-library/react";
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
// 3, player #7) is the latest.
const allEntries = [makeEntry(1, "p1"), makeEntry(2, "p1"), makeEntry(3, "p2")];
const indexed = (entries: EntryView[]): IndexedEntry[] =>
  entries.map((entry, index) => ({ entry, index }));

// The Preview bar is only present while recording an uncommitted draft.
const makePreview = (
  overrides: Partial<SummaryDrawerPreview> = {},
): SummaryDrawerPreview => ({
  entry: allEntries[2],
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
    await user.click(rows[0]);

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(rows[0]).toHaveAttribute("data-expanded", "false");
  });

  it("expanded: tapping a row inline-expands it, and tapping another collapses the first (single-open)", async () => {
    const user = userEvent.setup();
    render(<SummaryDrawerCard {...baseProps} state="expanded" />);

    const rows = await screen.findAllByTestId("entry-row");
    await user.click(rows[0]);
    expect(rows[0]).toHaveAttribute("data-expanded", "true");

    await user.click(rows[1]);
    expect(rows[0]).toHaveAttribute("data-expanded", "false");
    expect(rows[1]).toHaveAttribute("data-expanded", "true");
  });
});

describe("SummaryDrawerCard backdrop overlay", () => {
  it("idle: the backdrop is transparent and non-interactive (peek leaves the page usable)", () => {
    render(<SummaryDrawerCard {...baseProps} state="idle" />);

    const overlay = screen.getByTestId("summary-drawer-overlay");
    expect(overlay).toHaveClass("opacity-0", "pointer-events-none");
  });

  it("expanded: the backdrop is opaque, and tapping it collapses the drawer", () => {
    const onToggle = jest.fn();
    render(
      <SummaryDrawerCard {...baseProps} state="expanded" onToggle={onToggle} />,
    );

    const overlay = screen.getByTestId("summary-drawer-overlay");
    expect(overlay).toHaveClass("opacity-100");
    expect(overlay).not.toHaveClass("pointer-events-none");

    // fireEvent (not userEvent): the overlay's own interactivity is asserted via
    // the classes above; userEvent's pointer-events check flakes when a prior
    // suite's radix modal leaves document.body with pointer-events:none, which
    // this out-of-portal overlay would inherit. This tests the handler wiring.
    fireEvent.click(overlay);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

// D8/D12 gesture split, exercised through the draft Preview bar (present only
// while recording). PreviewCard's own tap-handling is covered in
// preview.test.tsx.
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

  it("while recording, the draft is the pulsing Preview, not a separate committed row", async () => {
    render(
      <SummaryDrawerCard
        {...baseProps}
        state="expanded"
        preview={makePreview({ isEditing: true, isComplete: false })}
      />,
    );

    expect(
      screen.queryByTestId("summary-drawer-draft-row"),
    ).not.toBeInTheDocument();
    expect(await screen.findByTestId("preview-trigger")).toHaveClass(
      "animate-pulse",
    );
  });
});
