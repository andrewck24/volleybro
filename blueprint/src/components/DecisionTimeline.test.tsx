import { render, screen } from "@testing-library/react";

import type { DecisionRecord } from "@/lib/decision-record";

import { DecisionTimeline } from "./DecisionTimeline";

const decision: DecisionRecord = {
  schemaVersion: 2,
  id: "0001",
  title: "Keep workflow repository-owned",
  capabilities: ["platform/delivery-workflow"],
  context: "Manual delivery must remain possible.",
  decision: "Use a repository-owned workflow contract.",
  alternatives: [
    {
      option: "Make Symphony own delivery policy",
      reason: "It would couple durable workflow knowledge to the runtime.",
    },
  ],
  consequences: ["Manual and orchestrated Apply share one contract."],
  revisitTriggers: ["A repository cannot express its delivery policy."],
};

describe("DecisionTimeline", () => {
  it("renders capabilities, rationale, rejected alternatives, and revisit triggers", () => {
    render(<DecisionTimeline decisions={[decision]} />);

    expect(screen.getByText("platform/delivery-workflow")).toBeInTheDocument();
    expect(screen.getByText(decision.decision)).toBeInTheDocument();
    expect(
      screen.getByText(decision.alternatives[0].option),
    ).toBeInTheDocument();
    expect(screen.getByText(decision.revisitTriggers[0])).toBeInTheDocument();
  });

  it("marks a superseded decision with its replacement", () => {
    render(
      <DecisionTimeline decisions={[{ ...decision, supersededBy: "0045" }]} />,
    );

    expect(screen.getByText("Superseded by 0045")).toBeInTheDocument();
  });

  it("renders nothing for a capability that names no decisions", () => {
    const { container } = render(<DecisionTimeline decisions={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when decisions is undefined", () => {
    const { container } = render(<DecisionTimeline />);

    expect(container).toBeEmptyDOMElement();
  });
});
