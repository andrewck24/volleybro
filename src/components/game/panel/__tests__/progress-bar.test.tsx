import { EntryProgressBar } from "@/components/game/panel/progress-bar";
import type { ProgressStep } from "@/components/game/panel/entry-progress";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";

const steps: ProgressStep[] = [
  { key: "player", caption: "選擇球員" },
  { key: "home", caption: "我方得失分紀錄" },
  { key: "away", caption: "對方得失分紀錄" },
];

// jsdom has no native PointerEvent implementation, so fireEvent.pointerX
// helpers silently drop clientX. Build a MouseEvent under the pointer event
// type name instead — React dispatches on event.type, not constructor identity.
const pointerEvent = (type: string, clientX: number) =>
  new MouseEvent(type, { bubbles: true, cancelable: true, clientX });

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

  it("switches the step on a recognized pointer swipe and suppresses the resulting tap", () => {
    const onStepChange = jest.fn();
    render(
      <EntryProgressBar
        steps={steps}
        activeStep={0}
        reachableSteps={[0, 1, 2]}
        onStepChange={onStepChange}
      />,
    );

    const track = screen.getByTestId("entry-progress-bar-track");

    fireEvent(track, pointerEvent("pointerdown", 100));
    fireEvent(track, pointerEvent("pointermove", 40));
    fireEvent(track, pointerEvent("pointerup", 40));

    expect(onStepChange).toHaveBeenCalledTimes(1);
    expect(onStepChange).toHaveBeenCalledWith(1);

    // a real swipe gesture also synthesizes a click on the element under the
    // pointer; that click must be suppressed rather than firing a second
    // (possibly conflicting) step change.
    fireEvent.click(screen.getByRole("button", { name: "我方得失分紀錄" }));
    expect(onStepChange).toHaveBeenCalledTimes(1);
  });

  it("does not let a swipe reach an unreachable step, mirroring the tap guard", () => {
    const onStepChange = jest.fn();
    render(
      <EntryProgressBar
        steps={steps}
        activeStep={0}
        reachableSteps={[0]}
        onStepChange={onStepChange}
      />,
    );

    const track = screen.getByTestId("entry-progress-bar-track");

    fireEvent(track, pointerEvent("pointerdown", 100));
    fireEvent(track, pointerEvent("pointermove", 40));
    fireEvent(track, pointerEvent("pointerup", 40));

    expect(onStepChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "我方得失分紀錄" }));
    expect(onStepChange).not.toHaveBeenCalled();
  });

  it("still calls onStepChange for a plain tap with no drag", () => {
    const onStepChange = jest.fn();
    render(
      <EntryProgressBar
        steps={steps}
        activeStep={0}
        reachableSteps={[0, 1]}
        onStepChange={onStepChange}
      />,
    );

    const track = screen.getByTestId("entry-progress-bar-track");
    const homeSegment = screen.getByRole("button", { name: "我方得失分紀錄" });

    fireEvent(track, pointerEvent("pointerdown", 100));
    fireEvent(track, pointerEvent("pointerup", 100));
    fireEvent.click(homeSegment);

    expect(onStepChange).toHaveBeenCalledTimes(1);
    expect(onStepChange).toHaveBeenCalledWith(1);
  });

  it("keeps unreachable steps focusable and free of accessibility violations", async () => {
    const { container } = render(
      <EntryProgressBar
        steps={steps}
        activeStep={0}
        reachableSteps={[0]}
        onStepChange={jest.fn()}
      />,
    );

    const homeSegment = screen.getByRole("button", { name: "我方得失分紀錄" });
    expect(homeSegment).toHaveAttribute("aria-disabled", "true");
    expect(homeSegment).toBeEnabled();
    expect(homeSegment.tabIndex).toBe(0);
    expect(homeSegment).toHaveAttribute("title");

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
