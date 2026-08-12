import { render, screen } from "@testing-library/react";

import { ChangeOverview } from "./ChangeOverview";

const base = {
  date: "2026-08-08",
  summary: "Canonical summary.",
  artifacts: [{ title: "Design", href: "/changes/in-progress/sample/design" }],
};

describe("ChangeOverview", () => {
  it("shows the lifecycle when it is finer-grained than the status", () => {
    render(
      <ChangeOverview
        {...base}
        status="in-progress"
        lifecycle="awaiting-delivery-review"
      />,
    );

    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("awaiting-delivery-review")).toBeInTheDocument();
  });

  it("does not repeat the status as a lifecycle badge", () => {
    render(
      <ChangeOverview {...base} status="discussing" lifecycle="discussing" />,
    );

    expect(screen.getAllByText("Discussing")).toHaveLength(1);
  });
});
