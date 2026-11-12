import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RiskTable } from "./risk-table";

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
    expect(rows[1]).toHaveTextContent("High risk");
    expect(rows[2]).toHaveTextContent("Medium risk");
    expect(rows[3]).toHaveTextContent("Info risk");
    expect(rows[4]).toHaveTextContent("Low risk");
  });

  it("renders a backtick-quoted span in a risk field as inline code", () => {
    render(
      <RiskTable
        risks={[
          {
            name: "Stale `cache.ts`",
            severity: "warning",
            mitigation: "clear it",
          },
        ]}
      />,
    );

    expect(screen.getByText("cache.ts").tagName).toBe("CODE");
  });

  it("renders strong text in the name and mitigation fields", () => {
    render(
      <RiskTable
        risks={[
          {
            name: "Blocked **write** path",
            severity: "critical",
            mitigation: "Rebuild **stale** data via `reindex`.",
          },
        ]}
      />,
    );

    expect(screen.getByText("write")).toHaveProperty("tagName", "STRONG");
    expect(screen.getByText("stale")).toHaveProperty("tagName", "STRONG");
    expect(screen.getByText("reindex")).toHaveProperty("tagName", "CODE");
  });
});
