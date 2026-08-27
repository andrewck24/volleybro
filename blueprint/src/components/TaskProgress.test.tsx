import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TaskProgress } from "./TaskProgress";

describe("TaskProgress", () => {
  it("renders label with done/total", () => {
    render(<TaskProgress done={3} total={7} />);
    expect(screen.getByText("3/7")).toBeInTheDocument();
  });

  it("reflects done/total as the progressbar value", () => {
    render(<TaskProgress done={3} total={7} />);
    const bar = screen.getByTestId("progress-bar");
    expect(bar).toHaveAttribute("role", "progressbar");
    expect(bar).toHaveValue((3 / 7) * 100);
  });
});
