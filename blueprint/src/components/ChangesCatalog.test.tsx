import { render, screen } from "@testing-library/react";

import { ChangesCatalog } from "./ChangesCatalog";

jest.mock("next/navigation", () => ({
  usePathname: () => "/changes",
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("ChangesCatalog", () => {
  it("renders status sections, metadata badges, and archive months", () => {
    render(
      <ChangesCatalog
        changes={[
          {
            schemaVersion: 1,
            slug: "active-change",
            title: "Active Change",
            status: "in-progress",
            lifecycle: "applying",
            startedAt: "2026-08-01",
            summary: "An active change.",
            capabilities: ["platform/blueprint"],
            tags: ["workflow"],
            href: "/changes/in-progress/active-change/",
          },
          {
            schemaVersion: 1,
            slug: "archived-change",
            title: "Archived Change",
            status: "archived",
            lifecycle: "archived",
            startedAt: "2026-07-01",
            archivedAt: "2026-07-12",
            summary: "An archived change.",
            capabilities: ["game-recording/rally-input"],
            tags: ["recording"],
            href: "/changes/archive/archived-change/",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "In Progress" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Archive" }),
    ).toBeInTheDocument();
    expect(screen.getByText("platform/blueprint")).toBeInTheDocument();
    expect(screen.getByText("workflow")).toBeInTheDocument();
    expect(screen.getByText("July 2026")).toBeInTheDocument();
    expect(screen.getByText("Archived Change")).toBeInTheDocument();
  });
});
