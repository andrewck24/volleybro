import { render, screen } from "@testing-library/react";

import { ImplementationSlices } from "./ImplementationSlices";

describe("ImplementationSlices", () => {
  it("renders durable slice progress, dependencies, and verification", () => {
    render(
      <ImplementationSlices
        slices={[
          {
            id: "S01",
            title: "Prepare repository contract",
            capabilities: ["platform/delivery-workflow"],
            dependsOn: [],
            outcome: "The repository owns its execution contract.",
            acceptanceCriteria: ["Manual execution remains supported."],
            verification: ["Run the workflow conformance check."],
            status: "completed",
          },
          {
            id: "S02",
            title: "Render implementation slices",
            capabilities: ["platform/blueprint"],
            dependsOn: ["S01"],
            outcome: "Blueprint renders the canonical JSON plan.",
            acceptanceCriteria: ["The dependency is visible."],
            verification: ["Build Blueprint."],
            status: "pending",
          },
        ]}
      />,
    );

    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(screen.getByText("S01", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText("Build Blueprint.")).toBeInTheDocument();
    expect(screen.getAllByTestId("slice-metadata")[0]).toHaveClass(
      "not-prose",
      "items-start",
    );
  });

  it("rejects unsupported runtime statuses", () => {
    expect(() =>
      render(
        <ImplementationSlices
          slices={[
            {
              id: "S01",
              title: "Invalid runtime state",
              capabilities: [],
              dependsOn: [],
              outcome: "Runtime claims do not belong in Git.",
              acceptanceCriteria: [],
              verification: [],
              status: "running",
            },
          ]}
        />,
      ),
    ).toThrow("Unsupported implementation slice status: running");
  });
});
