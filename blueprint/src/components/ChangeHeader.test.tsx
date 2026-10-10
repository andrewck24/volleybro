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

  it("shows archived after a Change lands", () => {
    render(
      <ChangeHeader
        title="Archived Change"
        capabilities={[]}
        facts={{ gate: "G2", archivedAt: "2026-09-26T02:42:58.000Z" }}
      />,
    );

    expect(screen.getByText("archived")).toBeInTheDocument();
    expect(screen.queryByText("G2 Review")).not.toBeInTheDocument();
  });

  it("shows a Migration's current shard, its gate and how many have merged", () => {
    render(
      <ChangeHeader
        title="Testing Tiers"
        capabilities={[]}
        facts={{
          gate: "G2",
          shards: { count: 4, current: 2, merged: 1, items: [] },
        }}
      />,
    );

    expect(screen.getByText("Shard 2/4 · G2 Review")).toBeInTheDocument();
    expect(screen.getByText("1/4 merged")).toBeInTheDocument();
  });

  it("shows a later shard with no Review yet without a gate", () => {
    render(
      <ChangeHeader
        title="Testing Tiers"
        capabilities={[]}
        facts={{ shards: { count: 4, current: 2, merged: 1, items: [] } }}
      />,
    );

    expect(screen.getByText("Shard 2/4")).toBeInTheDocument();
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

    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["2 commits", "8 scenarios"]);
  });

  it("uses the singular for a figure of one", () => {
    render(
      <ChangeHeader
        title="Single Page Change"
        capabilities={[]}
        facts={{ commits: 1, filesChanged: 1, scenarios: 1 }}
      />,
    );

    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["1 commit", "1 file", "1 scenario"]);
  });
});
