import { render, screen } from "@testing-library/react";

import { DecisionTimeline } from "./DecisionTimeline";
import { LegacyDecisionsProvider } from "@/legacy/legacy-decisions-context";

const decision = {
  schemaVersion: 1,
  id: "D1",
  title: "Keep workflow repository-owned",
  targets: ["platform/delivery-workflow"],
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
  it("renders targets, rationale, rejected alternatives, and revisit triggers", () => {
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
      <DecisionTimeline decisions={[{ ...decision, supersededBy: "D45" }]} />,
    );

    expect(screen.getByText("Superseded by D45")).toBeInTheDocument();
  });

  it("rejects schema-incompatible records", () => {
    expect(() =>
      render(
        <DecisionTimeline decisions={[{ ...decision, status: "accepted" }]} />,
      ),
    ).toThrow("Invalid decision record: D1");

    expect(() =>
      render(
        <DecisionTimeline
          decisions={[{ ...decision, claimedBy: "worker-1" }]}
        />,
      ),
    ).toThrow("Invalid decision record: D1");
  });

  it("renders a legacy status-carrying record under LegacyDecisionsProvider", () => {
    render(
      <LegacyDecisionsProvider>
        <DecisionTimeline decisions={[{ ...decision, status: "accepted" }]} />
      </LegacyDecisionsProvider>,
    );

    expect(screen.getByText(decision.decision)).toBeInTheDocument();
  });

  it("renders nothing for a capability that names no decisions", () => {
    const { container } = render(<DecisionTimeline decisions={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("still rejects an unknown key other than status under LegacyDecisionsProvider", () => {
    expect(() =>
      render(
        <LegacyDecisionsProvider>
          <DecisionTimeline
            decisions={[{ ...decision, claimedBy: "worker-1" }]}
          />
        </LegacyDecisionsProvider>,
      ),
    ).toThrow("Invalid decision record: D1");
  });
});
