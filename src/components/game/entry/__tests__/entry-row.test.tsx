import { EntryRow } from "@/components/game/entry";
import { EntryType, MoveType } from "@/entities/game";
import type { EntryView, GamePlayerView } from "@/lib/features/game/types";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const players: GamePlayerView[] = [
  { id: "p1", name: "選手一", number: 4, stats: [] },
];

const entry: EntryView = {
  type: EntryType.RALLY,
  win: true,
  home: {
    score: 1,
    type: MoveType.SERVING,
    num: 0,
    player: { id: "p1", zone: 1 },
  },
  away: { score: 0, type: MoveType.SERVING, num: 1 },
} as unknown as EntryView;

// jsdom has no native PointerEvent; build a MouseEvent under the pointer
// event type name instead, mirroring panel/progress-bar.test.tsx.
const pointerEvent = (type: string, clientX: number) =>
  new MouseEvent(type, { bubbles: true, cancelable: true, clientX });

describe("EntryRow", () => {
  it("is collapsed and unrevealed by default", () => {
    render(<EntryRow entry={entry} players={players} isLatest={true} />);

    expect(screen.queryByTestId("entry-row-expanded")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("entry-row-swipe-actions"),
    ).not.toBeInTheDocument();
  });

  // Scenario: Tap inline-expands the row in place
  it("toggles the inline-expanded accordion content on tap", async () => {
    const user = userEvent.setup();
    render(<EntryRow entry={entry} players={players} isLatest={true} />);

    await user.click(screen.getByTestId("entry-row"));
    expect(screen.getByTestId("entry-row-expanded")).toBeInTheDocument();

    await user.click(screen.getByTestId("entry-row"));
    expect(screen.queryByTestId("entry-row-expanded")).not.toBeInTheDocument();
  });

  // Scenario: Left-swipe reveals action buttons
  it("reveals action buttons on a recognized left-swipe and suppresses the resulting tap", () => {
    render(<EntryRow entry={entry} players={players} isLatest={true} />);

    const row = screen.getByTestId("entry-row");
    fireEvent(row, pointerEvent("pointerdown", 100));
    fireEvent(row, pointerEvent("pointermove", 40));
    fireEvent(row, pointerEvent("pointerup", 40));

    expect(screen.getByTestId("entry-row-swipe-actions")).toBeInTheDocument();

    // the swipe's synthesized click must not also toggle the expansion.
    fireEvent.click(row);
    expect(screen.queryByTestId("entry-row-expanded")).not.toBeInTheDocument();
  });

  it("does not reveal action buttons on a right-swipe", () => {
    render(<EntryRow entry={entry} players={players} isLatest={true} />);

    const row = screen.getByTestId("entry-row");
    fireEvent(row, pointerEvent("pointerdown", 40));
    fireEvent(row, pointerEvent("pointermove", 100));
    fireEvent(row, pointerEvent("pointerup", 100));

    expect(
      screen.queryByTestId("entry-row-swipe-actions"),
    ).not.toBeInTheDocument();
  });

  // Scenario: Latest entry exposes edit and delete
  it("shows edit and delete for the latest entry", async () => {
    const user = userEvent.setup();
    render(<EntryRow entry={entry} players={players} isLatest={true} />);

    await user.click(screen.getByTestId("entry-row"));
    expect(screen.getByTestId("entry-action-edit")).toBeInTheDocument();
    expect(screen.getByTestId("entry-action-delete")).toBeInTheDocument();
    expect(
      screen.queryByTestId("entry-action-rollbackToHere"),
    ).not.toBeInTheDocument();
  });

  // Scenario: Non-latest entry exposes rollback instead of delete
  it("shows edit and rollback, never delete, for a non-latest entry", async () => {
    const user = userEvent.setup();
    render(<EntryRow entry={entry} players={players} isLatest={false} />);

    await user.click(screen.getByTestId("entry-row"));
    expect(screen.getByTestId("entry-action-edit")).toBeInTheDocument();
    expect(
      screen.getByTestId("entry-action-rollbackToHere"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("entry-action-delete")).not.toBeInTheDocument();
  });

  it("invokes the matching callback and does not also toggle expansion", async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    render(
      <EntryRow
        entry={entry}
        players={players}
        isLatest={true}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByTestId("entry-row"));
    await user.click(screen.getByTestId("entry-action-delete"));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
  });
});
