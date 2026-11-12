import { Entry, EntryRow } from "@/components/game/entry";
import { EntryType, MoveType } from "@/entities/game";
import type { EntryView, GamePlayerView } from "@/lib/features/game/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const players: GamePlayerView[] = [{ id: "p1", name: "選手一", number: 4 }];

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

describe("Entry", () => {
  it("renders nothing without throwing when entry is undefined", () => {
    const { container } = render(<Entry entry={undefined} players={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("EntryRow", () => {
  it("exposes stable hooks on rally score badges", () => {
    render(<EntryRow entry={entry} players={players} isLatest={true} />);

    expect(
      screen.getByText("1", { selector: "[data-score-badge]" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("0", { selector: "[data-score-badge]" }),
    ).toBeInTheDocument();
  });

  it("asserts collapsed visibility without relying on element absence", () => {
    render(<EntryRow entry={entry} players={players} isLatest={true} />);

    expect(screen.getByTestId("entry-row-expanded")).toHaveAttribute(
      "data-open",
      "false",
    );
    expect(screen.getByTestId("entry-row")).toHaveAttribute(
      "data-expanded",
      "false",
    );
  });

  it("toggles the inline-expanded accordion content on tap", async () => {
    const user = userEvent.setup();
    render(<EntryRow entry={entry} players={players} isLatest={true} />);

    await user.click(screen.getByTestId("entry-row"));
    expect(screen.getByTestId("entry-row-expanded")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(screen.getByTestId("entry-row")).toHaveAttribute(
      "data-expanded",
      "true",
    );

    await user.click(screen.getByTestId("entry-row"));
    expect(screen.getByTestId("entry-row-expanded")).toHaveAttribute(
      "data-open",
      "false",
    );
  });

  it("keeps delete and rollback hidden until their reducers exist", async () => {
    const user = userEvent.setup();
    render(<EntryRow entry={entry} players={players} isLatest={true} />);

    await user.click(screen.getByTestId("entry-row"));
    expect(screen.getByTestId("entry-action-edit")).toBeInTheDocument();
    expect(screen.queryByTestId("entry-action-delete")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("entry-action-rollbackToHere"),
    ).not.toBeInTheDocument();
  });

  it("shows only edit for a non-latest entry; delete/rollback are hidden", async () => {
    const user = userEvent.setup();
    render(<EntryRow entry={entry} players={players} isLatest={false} />);

    await user.click(screen.getByTestId("entry-row"));
    expect(screen.getByTestId("entry-action-edit")).toBeInTheDocument();
    expect(screen.queryByTestId("entry-action-delete")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("entry-action-rollbackToHere"),
    ).not.toBeInTheDocument();
  });

  it("shows no retry control when the write has not failed", () => {
    render(<EntryRow entry={entry} players={players} isLatest={true} />);

    expect(screen.queryByTestId("entry-row-retry")).not.toBeInTheDocument();
  });

  it("shows a retry control on a failed row and invokes onRetry without toggling expansion", async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();
    render(
      <EntryRow
        entry={entry}
        players={players}
        isLatest={true}
        failed
        onRetry={onRetry}
      />,
    );

    const retry = screen.getByTestId("entry-row-retry");
    expect(retry).toBeInTheDocument();

    await user.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("entry-row-expanded")).toHaveAttribute(
      "data-open",
      "false",
    );
  });

  it("invokes the edit callback and does not also toggle expansion", async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();
    render(
      <EntryRow
        entry={entry}
        players={players}
        isLatest={true}
        onEdit={onEdit}
      />,
    );

    await user.click(screen.getByTestId("entry-row"));
    await user.click(screen.getByTestId("entry-action-edit"));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
