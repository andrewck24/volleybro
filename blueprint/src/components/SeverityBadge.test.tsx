import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SeverityBadge } from "./SeverityBadge";

describe("SeverityBadge", () => {
  const levels = ["critical", "warning", "info", "ok"] as const;

  levels.forEach((level) => {
    it(`renders data-level="${level}" for level="${level}"`, () => {
      render(<SeverityBadge level={level} />);
      const badge = screen.getByTestId("severity-badge");
      expect(badge).toHaveAttribute("data-level", level);
    });
  });
});
