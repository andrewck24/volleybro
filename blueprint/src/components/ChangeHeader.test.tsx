import { render, screen } from "@testing-library/react";

import { ChangeHeader } from "./ChangeHeader";

describe("ChangeHeader", () => {
  it("links each capability to its Feature page and shows the gate", () => {
    render(
      <ChangeHeader
        title="Single Page Change"
        capabilities={["platform/blueprint"]}
        facts={{ gate: "G2" }}
      />,
    );

    expect(
      screen.getByRole("link", { name: "platform/blueprint" }),
    ).toHaveAttribute("href", "/features/platform/blueprint");
    expect(screen.getByText("G2 Review")).toBeInTheDocument();
  });

  it("hides figures that are null or zero", () => {
    render(
      <ChangeHeader
        title="Single Page Change"
        capabilities={[]}
        facts={{
          gate: "G1",
          commits: 2,
          filesChanged: null,
          insertions: 0,
          deletions: 0,
          srcFilesChanged: 0,
          scenarios: 8,
        }}
      />,
    );

    expect(screen.getByText("2 commits，8 scenarios")).toBeInTheDocument();
  });
});
