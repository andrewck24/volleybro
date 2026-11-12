import { Calendar } from "@/components/ui/calendar";
import { render, screen } from "@testing-library/react";

describe("Calendar", () => {
  it("shrinks calendar cells only below the control-size fit width", () => {
    render(
      <Calendar
        role="application"
        aria-label="calendar"
        defaultMonth={new Date(2024, 0)}
      />,
    );

    expect(screen.getByRole("application", { name: "calendar" })).toHaveStyle({
      "--cell-size":
        "min(var(--control-size), (100vw - var(--spacing) * 6 - 1rem) / 7)",
    });
  });
});
