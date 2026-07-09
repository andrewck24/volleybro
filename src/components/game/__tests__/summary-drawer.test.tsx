import {
  SummaryDrawerCard,
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
// 3, player #7) is the latest.
const entries = [makeEntry(1, "p1"), makeEntry(2, "p1"), makeEntry(3, "p2")];

const makePreview = (
  overrides: Partial<SummaryDrawerPreview> = {},
): SummaryDrawerPreview => ({
  entry: entries[2],
  previousEntry: entries[1],
  players,
  isEditing: false,
  isComplete: false,
  entryIndex: 3,
  ...overrides,
});

describe("SummaryDrawerCard idle state", () => {
  it("shows the Preview bar (not an EntryRow) and no list rows", () => {
    render(
      <SummaryDrawerCard
        entries={entries}
        players={players}
        state="idle"
        preview={makePreview()}
      />,
    );

    expect(screen.getByTestId("preview-card")).toBeInTheDocument();
    expect(screen.queryByTestId("summary-drawer-row")).not.toBeInTheDocument();
  });

  it("renders no Preview bar when preview data is absent", () => {
    render(
      <SummaryDrawerCard entries={entries} players={players} state="idle" />,
    );

    expect(screen.queryByTestId("preview-card")).not.toBeInTheDocument();
  });

  it("does not crash and renders no row when there are no entries", () => {
    render(<SummaryDrawerCard entries={[]} players={players} state="idle" />);

    expect(screen.queryByTestId("summary-drawer-row")).not.toBeInTheDocument();
  });
});

describe("SummaryDrawerCard expanded state (modal Drawer)", () => {
  it("promotes the latest entry to the first row of the full list", () => {
    render(
      <SummaryDrawerCard
        entries={entries}
        players={players}
        state="expanded"
      />,
    );

    const rows = screen.getAllByTestId("summary-drawer-row");
    expect(rows).toHaveLength(entries.length);
    // The latest entry (#7) rises to the first row; the rest follow in
    // reverse-chronological order.
    expect(rows[0]).toHaveTextContent("7");
    expect(rows[1]).toHaveTextContent("4");
    expect(rows[2]).toHaveTextContent("4");
  });

  it("handles an empty entry list without crashing", () => {
    render(
      <SummaryDrawerCard entries={[]} players={players} state="expanded" />,
    );

    expect(screen.queryByTestId("summary-drawer-row")).not.toBeInTheDocument();
  });
});

describe("SummaryDrawerCard handle", () => {
  it("closing the modal (handle click) calls onToggle", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(
      <SummaryDrawerCard
        entries={entries}
        players={players}
        state="expanded"
        onToggle={onToggle}
      />,
    );

    await user.click(screen.getByTestId("summary-drawer-handle"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

// D8/D12 "Handle expands drawer during input with draft in first row": while
// input is in progress and the drawer is expanded, the draft occupies the
// first row in a pulsing style distinct from committed rows.
describe("SummaryDrawerCard draft-in-progress first row", () => {
  const draftEntry = makeEntry(4, "p2");

  it("renders the draft as the pulsing first row, ahead of committed entries", () => {
    render(
      <SummaryDrawerCard
        entries={entries}
        players={players}
        state="expanded"
        draftEntry={draftEntry}
        isDraftPulsing={true}
      />,
    );

    const draftRow = screen.getByTestId("summary-drawer-draft-row");
    expect(draftRow).toHaveClass("animate-pulse");

    const rows = screen.getAllByTestId("summary-drawer-row");
    // The draft row is a separate element preceding the committed rows in
    // DOM order; committed rows never carry the pulse class.
    rows.forEach((row) => expect(row).not.toHaveClass("animate-pulse"));
  });

  it("does not render a draft row once the draft is gone (freeze -> committed)", () => {
    // On freeze, the caller stops passing `draftEntry` and the newly
    // committed entry (already the last item of `entries`) becomes the
    // formal first row in place -- no separate draft row remains.
    render(
      <SummaryDrawerCard
        entries={entries}
        players={players}
        state="expanded"
      />,
    );

    expect(
      screen.queryByTestId("summary-drawer-draft-row"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByTestId("summary-drawer-row")[0]).toHaveTextContent(
      "7",
    );
  });

  it("does not render the modal (or the draft row) while idle", () => {
    render(
      <SummaryDrawerCard
        entries={entries}
        players={players}
        state="idle"
        draftEntry={draftEntry}
        isDraftPulsing={true}
      />,
    );

    expect(
      screen.queryByTestId("summary-drawer-draft-row"),
    ).not.toBeInTheDocument();
  });
});

// D8/D12 gesture split, exercised through SummaryDrawerCard's own wiring of
// the Preview bar (PreviewCard's tap-handling itself is covered in
// preview.test.tsx).
describe("SummaryDrawerCard Preview bar wiring", () => {
  it("tapping the Preview bar while idle (not editing) calls onToggle to expand", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(
      <SummaryDrawerCard
        entries={entries}
        players={players}
        state="idle"
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
        entries={entries}
        players={players}
        state="idle"
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
        entries={entries}
        players={players}
        state="idle"
        preview={makePreview({ isEditing: true, isComplete: false })}
        onToggle={onToggle}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByTestId("preview-trigger"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onToggle).not.toHaveBeenCalled();
  });
});
