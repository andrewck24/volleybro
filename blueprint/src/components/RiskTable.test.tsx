import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RiskTable } from "./RiskTable";

describe("RiskTable", () => {
  const risks = [
    { name: "Low risk", severity: "ok" as const, mitigation: "monitor" },
    { name: "High risk", severity: "critical" as const, mitigation: "fix now" },
    { name: "Medium risk", severity: "warning" as const, mitigation: "review" },
    { name: "Info risk", severity: "info" as const, mitigation: "log it" },
  ];

  it("renders rows sorted by severity (critical first)", () => {
    render(<RiskTable risks={risks} />);
    const rows = screen.getAllByRole("row");
    // rows[0] is header, rows[1] should be critical
    expect(rows[1]).toHaveTextContent("High risk");
    expect(rows[2]).toHaveTextContent("Medium risk");
    expect(rows[3]).toHaveTextContent("Info risk");
    expect(rows[4]).toHaveTextContent("Low risk");
  });
});
