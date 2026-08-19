import { render, screen } from "@testing-library/react";

import { ChangeOverview } from "./ChangeOverview";

const base = {
  date: "2026-08-08",
  summary: "Canonical summary.",
  artifacts: [{ title: "Design", href: "/changes/sample/design" }],
};

describe("ChangeOverview", () => {
  it("labels the badge with the lifecycle, not the coarse status", () => {
    render(<ChangeOverview {...base} lifecycle="pre-pr-review" />);

    expect(screen.getByText("pre-pr-review")).toBeInTheDocument();
    expect(screen.queryByText("In Progress")).not.toBeInTheDocument();
  });

  it("colours the badge by the status the lifecycle derives", () => {
    render(<ChangeOverview {...base} lifecycle="awaiting-delivery-review" />);

    expect(screen.getByText("awaiting-delivery-review")).toHaveAttribute(
      "data-status",
      "in-progress",
    );
  });
});
