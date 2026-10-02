import { fireEvent, render, screen } from "@testing-library/react";

import { ScenarioResults, TestPlan } from "./ScenarioCards";

const scenarios = [
  { id: "S1", given: "a page", when: "it opens", then: "Proposal shows" },
];

describe("ScenarioResults", () => {
  it("shows the result and pulls the scenario text by id when expanded", () => {
    render(
      <ScenarioResults
        scenarios={scenarios}
        results={[{ id: "S1", result: "pass", evidence: "jest" }]}
      />,
    );

    expect(screen.getByText("通過")).toBeInTheDocument();
    expect(screen.queryByText("Proposal shows")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /S1/ }));
    expect(screen.getByText("Proposal shows")).toBeInTheDocument();
  });
});

describe("TestPlan", () => {
  const item = {
    id: "T1",
    checks: "the header hides empty figures",
    method: "open the page",
    executor: "developer" as const,
    environment: "preview",
    result: "pending" as const,
    evidence: "none yet",
  };

  it("summarises the check, executor and result while collapsed", () => {
    render(<TestPlan items={[item]} />);

    expect(screen.getByText(item.checks)).toBeInTheDocument();
    expect(screen.getByText("開發者執行")).toBeInTheDocument();
    expect(screen.getByText("待執行")).toBeInTheDocument();
    expect(screen.queryByText(item.method)).not.toBeInTheDocument();
  });

  it("shows method, environment and evidence when expanded", () => {
    render(<TestPlan items={[item]} />);
    fireEvent.click(screen.getByRole("button", { name: /T1/ }));

    expect(screen.getByText(item.method)).toBeInTheDocument();
    expect(screen.getByText(item.environment)).toBeInTheDocument();
    expect(screen.getByText(item.evidence)).toBeInTheDocument();
  });

  it("labels an agent-run check", () => {
    render(
      <TestPlan items={[{ ...item, executor: "agent", result: "pass" }]} />,
    );
    expect(screen.getByText("agent 執行")).toBeInTheDocument();
    expect(screen.getByText("通過")).toBeInTheDocument();
  });
});
