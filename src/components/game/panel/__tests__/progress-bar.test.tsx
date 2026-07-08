import { EntryProgressBar } from "@/components/game/panel/progress-bar";
import type { ProgressStep } from "@/components/game/panel/entry-progress";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const steps: ProgressStep[] = [
  { key: "player", caption: "選擇球員" },
  { key: "home", caption: "我方得失分紀錄" },
  { key: "away", caption: "對方得失分紀錄" },
];

describe("EntryProgressBar", () => {
  it("renders one segment per step with no inline text and shows the active caption", () => {
    render(
      <EntryProgressBar
        steps={steps}
        activeStep={0}
        reachableSteps={[0]}
        onStepChange={jest.fn()}
      />,
    );

    const segments = screen.getAllByRole("button");
    expect(segments).toHaveLength(3);
    segments.forEach((segment) => expect(segment).toHaveTextContent(""));
    expect(screen.getByText("選擇球員")).toBeInTheDocument();
  });

  it("rotates the caption when the active step changes", () => {
    const { rerender } = render(
      <EntryProgressBar
        steps={steps}
        activeStep={0}
        reachableSteps={[0, 1]}
        onStepChange={jest.fn()}
      />,
    );
    expect(screen.getByText("選擇球員")).toBeInTheDocument();

    rerender(
      <EntryProgressBar
        steps={steps}
        activeStep={1}
        reachableSteps={[0, 1]}
        onStepChange={jest.fn()}
      />,
    );

    expect(screen.getByText("我方得失分紀錄")).toBeInTheDocument();
  });

  it("marks unreachable steps with aria-disabled while keeping them focusable", async () => {
    const onStepChange = jest.fn();
    render(
      <EntryProgressBar
        steps={steps}
        activeStep={0}
        reachableSteps={[0]}
        onStepChange={onStepChange}
      />,
    );

    const homeSegment = screen.getByRole("button", { name: "我方得失分紀錄" });
    expect(homeSegment).toHaveAttribute("aria-disabled", "true");
    expect(homeSegment).toBeEnabled();

    await userEvent.click(homeSegment);
    expect(onStepChange).not.toHaveBeenCalled();
  });

  it("calls onStepChange when tapping a reachable step", async () => {
    const onStepChange = jest.fn();
    render(
      <EntryProgressBar
        steps={steps}
        activeStep={0}
        reachableSteps={[0, 1]}
        onStepChange={onStepChange}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "我方得失分紀錄" }),
    );
    expect(onStepChange).toHaveBeenCalledWith(1);
  });
});
