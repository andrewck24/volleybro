import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ApproachComparison } from "./ApproachComparison";

describe("ApproachComparison", () => {
  const approaches = [
    { name: "Option A", pros: ["fast", "simple"], cons: ["limited"] },
    { name: "Option B", pros: ["flexible"], cons: ["complex", "slow"] },
    { name: "Option C", pros: ["cheap"], cons: [] },
  ];

  it("renders a row for each approach", () => {
    render(<ApproachComparison approaches={approaches} />);
    const rows = screen.getAllByRole("row");
    // subtract 1 for header row
    expect(rows.length - 1).toBe(approaches.length);
  });
});
