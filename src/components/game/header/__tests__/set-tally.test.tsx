import { SetTally } from "@/components/game/header/set-tally";
import { render, screen } from "@testing-library/react";

describe("SetTally", () => {
  it("renders one cell per set needed to win, sized from the match's set count", () => {
    render(<SetTally won={0} needed={3} side="home" />);

    expect(screen.getAllByTestId("set-tally-cell")).toHaveLength(3);
  });

  it("renders two cells for a three-set match", () => {
    render(<SetTally won={0} needed={2} side="home" />);

    expect(screen.getAllByTestId("set-tally-cell")).toHaveLength(2);
  });

  it("fills cells from the bottom as sets are won, leaving the rest hollow", () => {
    render(<SetTally won={2} needed={3} side="home" />);

    const cells = screen.getAllByTestId("set-tally-cell");
    // Cells render top to bottom; the bottom two must be filled first.
    expect(cells[0]).toHaveAttribute("data-filled", "false");
    expect(cells[1]).toHaveAttribute("data-filled", "true");
    expect(cells[2]).toHaveAttribute("data-filled", "true");
  });

  it("is entirely hollow before any set is won", () => {
    render(<SetTally won={0} needed={3} side="home" />);

    for (const cell of screen.getAllByTestId("set-tally-cell")) {
      expect(cell).toHaveAttribute("data-filled", "false");
    }
  });

  it("labels the home side and the away side distinctly for assistive tech", () => {
    const { unmount } = render(<SetTally won={1} needed={3} side="home" />);
    expect(screen.getByRole("img", { name: /我方/ })).toBeInTheDocument();
    unmount();

    render(<SetTally won={1} needed={3} side="away" />);
    expect(screen.getByRole("img", { name: /對手/ })).toBeInTheDocument();
  });
});
