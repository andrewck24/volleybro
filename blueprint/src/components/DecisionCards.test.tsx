import { fireEvent, render, screen } from "@testing-library/react";

import { DecisionCards } from "./DecisionCards";

const record = {
  schemaVersion: 2 as const,
  id: "0045",
  title: "People review at two gates",
  capabilities: ["platform/delivery-workflow"],
  decision: "Review happens at G1 and G2.",
  alternatives: [{ option: "Review every slice", reason: "Too many stops." }],
};

describe("DecisionCards", () => {
  it("shows only the number and title while collapsed", () => {
    render(<DecisionCards cards={[{ record }]} />);

    expect(screen.getByText("ADR-0045")).toBeInTheDocument();
    expect(screen.getByText(record.title)).toBeInTheDocument();
    expect(screen.queryByText(record.decision)).not.toBeInTheDocument();
  });

  it("shows the adopted decision and each rejected option when expanded", () => {
    render(<DecisionCards cards={[{ record }]} />);
    fireEvent.click(screen.getByRole("button", { name: /ADR-0045/ }));

    expect(screen.getByText(record.decision)).toBeInTheDocument();
    expect(screen.getByText("採用")).toBeInTheDocument();
    expect(screen.getByText("Review every slice")).toBeInTheDocument();
    expect(screen.getByText("棄用")).toBeInTheDocument();
  });

  it("marks a superseded record and links to its replacement when expanded", () => {
    render(
      <DecisionCards
        cards={[
          {
            record: { ...record, supersededBy: "0061" },
            supersededHref: "/features/platform/delivery-workflow#adr-0061",
          },
        ]}
      />,
    );

    expect(screen.getByText("被 ADR-0061 取代")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /ADR-0045/ }));
    expect(
      screen.getByRole("link", { name: "查看取代它的 ADR-0061" }),
    ).toHaveAttribute("href", "/features/platform/delivery-workflow#adr-0061");
  });
});
