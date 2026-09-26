import { render, screen } from "@testing-library/react";

import { DecisionTimeline } from "./DecisionTimeline";

const decision = {
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

  it("shows a note in place of a schema-incompatible record instead of throwing", () => {
    render(
      <DecisionTimeline decisions={[{ ...decision, status: "accepted" }]} />,
    );

    expect(
      screen.getByText(/Invalid decision record: 0001/),
    ).toBeInTheDocument();
  });

  it("renders the records that parse alongside a note for the one that does not", () => {
    const other = { ...decision, id: "0002", decision: "Use a second record." };
    render(
      <DecisionTimeline
        decisions={[decision, { ...other, claimedBy: "worker-1" }]}
      />,
    );

    expect(screen.getByText(decision.decision)).toBeInTheDocument();
    expect(
      screen.getByText(/Invalid decision record: 0002/),
    ).toBeInTheDocument();
    expect(screen.queryByText(other.decision)).not.toBeInTheDocument();
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
