import { render, screen } from "@testing-library/react";

import { ChangeCard } from "./ChangeCard";

describe("ChangeCard", () => {
  it("shows state, date, and folds capabilities past two into a count", () => {
    render(
      <ChangeCard
        change={{
          slug: "a",
          title: "A Change",
          href: "/changes/a",
          description: "What it does.",
          state: { label: "archived", status: "archived" },
          date: { kind: "archived", value: "2026-09-25T10:00:00.000Z" },
          capabilities: ["one", "two", "three"],
        }}
      />,
    );

    expect(screen.getByRole("link")).toHaveAttribute("href", "/changes/a");
    expect(screen.getByText("A Change")).toBeInTheDocument();
    expect(screen.getByText("What it does.")).toBeInTheDocument();
    expect(screen.getByText("archived")).toBeInTheDocument();
    expect(screen.getByText("2026-09-25")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(screen.queryByText("three")).not.toBeInTheDocument();
  });
});
