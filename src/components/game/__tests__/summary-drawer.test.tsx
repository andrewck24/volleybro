import { SummaryDrawerCard } from "@/components/game/summary-drawer";
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

describe("SummaryDrawerCard idle state", () => {
  it("shows only the handle and the latest entry", () => {
    render(
      <SummaryDrawerCard entries={entries} players={players} state="idle" />,
    );

    expect(screen.getByTestId("summary-drawer-handle")).toBeInTheDocument();
    const rows = screen.getAllByTestId("summary-drawer-row");
    expect(rows).toHaveLength(1);
    // Latest entry is the one scored by #7.
    expect(rows[0]).toHaveTextContent("7");
  });

  it("does not crash and renders no row when there are no entries", () => {
    render(<SummaryDrawerCard entries={[]} players={players} state="idle" />);

    expect(screen.getByTestId("summary-drawer-handle")).toBeInTheDocument();
    expect(screen.queryByTestId("summary-drawer-row")).not.toBeInTheDocument();
  });
});

describe("SummaryDrawerCard expanded state", () => {
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

describe("SummaryDrawerCard handle toggle", () => {
  it("calls onToggle when the handle is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(
      <SummaryDrawerCard
        entries={entries}
        players={players}
        state="idle"
        onToggle={onToggle}
      />,
    );

    await user.click(screen.getByTestId("summary-drawer-handle"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
