import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TaskProgress } from "./TaskProgress";

describe("TaskProgress", () => {
  it("renders label with done/total", () => {
    render(<TaskProgress done={3} total={7} />);
    expect(screen.getByText("3/7")).toBeInTheDocument();
  });

  it("renders progress bar with exact percentage width", () => {
    render(<TaskProgress done={3} total={7} />);
    const bar = screen.getByTestId("progress-bar");
    expect(bar).toHaveStyle({ width: `${(3 / 7) * 100}%` });
  });
});
