import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import { ChangeTabs } from "./ChangeTabs";
import { ActionItems, ReviewDetails, ReviewFocus } from "./ReviewSections";
import { ScenarioResults, TestPlan } from "./ScenarioCards";

// fumadocs-ui ships ESM that jest does not transform; the stub renders the
// props ChangeTabs decides, which is what these tests are about. Hash sync
// itself is fumadocs' behaviour and is checked in the browser.
jest.mock("fumadocs-ui/components/tabs", () => ({
  Tabs: ({
    items,
    defaultIndex,
    updateAnchor,
    children,
  }: {
    items: string[];
    defaultIndex: number;
    updateAnchor?: boolean;
    children: ReactNode;
  }) => (
    <div data-update-anchor={String(updateAnchor)}>
      {items.map((item, index) => (
        <button key={item} role="tab" aria-selected={index === defaultIndex}>
          {item}
        </button>
      ))}
      {children}
    </div>
  ),
  Tab: ({ id, children }: { id: string; children: ReactNode }) => (
    <section aria-label={id}>{children}</section>
  ),
}));

// A tab file compiles to a component that renders its top-level nodes in a
// fragment; these stand in for proposal.mdx and review files.
function body(...children: ReactNode[]) {
  return function TabFile() {
    return <>{children}</>;
  };
}

describe("ChangeTabs", () => {
  it("has only a Proposal tab before G2", () => {
    render(
      <ChangeTabs
        Proposal={body("proposal body")}
        reviews={[]}
        components={{}}
      />,
    );

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Proposal",
    ]);
  });

  it("opens on Proposal once a Review tab exists", () => {
    render(
      <ChangeTabs
        Proposal={body("proposal body")}
        reviews={[{ Body: body("review body") }]}
        components={{}}
      />,
    );

    expect(screen.getByRole("tab", { name: "Proposal" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Review" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("gives the Review tab the id #review opens", () => {
    render(
      <ChangeTabs
        Proposal={body("proposal body")}
        reviews={[{ Body: body("review body") }]}
        components={{}}
      />,
    );

    expect(screen.getByRole("region", { name: "review" })).toHaveTextContent(
      "review body",
    );
  });

  it("gives a Migration one tab per shard, each with its own figures", () => {
    render(
      <ChangeTabs
        Proposal={body("proposal body")}
        reviews={[
          { shard: 1, Body: body("first"), facts: { commits: 3 } },
          { shard: 2, Body: body("second"), facts: { commits: 1 } },
        ]}
        components={{}}
      />,
    );

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Proposal",
      "Shard 1",
      "Shard 2",
    ]);
    expect(screen.getByRole("region", { name: "review-s1" })).toHaveTextContent(
      "3 commitsfirst",
    );
    expect(screen.getByRole("region", { name: "review-s2" })).toHaveTextContent(
      "1 commitsecond",
    );
  });

  it("shows a tab that cannot render as a message and keeps the others", () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const broken = () => {
      throw new Error("missing record");
    };
    render(
      <ChangeTabs
        Proposal={body("proposal body")}
        reviews={[{ Body: broken }]}
        components={{}}
      />,
    );

    expect(screen.getByRole("region", { name: "proposal" })).toHaveTextContent(
      "proposal body",
    );
    expect(screen.getByRole("region", { name: "review" })).toHaveTextContent(
      "missing record",
    );
  });

  it("passes the page's components to each tab", () => {
    const Marker = () => <span>marker</span>;
    const withComponents = ({
      components,
    }: {
      components?: Record<string, unknown>;
    }) => {
      const Given = components?.Marker as typeof Marker;
      return <Given />;
    };
    render(
      <ChangeTabs
        Proposal={withComponents}
        reviews={[]}
        components={{ Marker }}
      />,
    );

    expect(screen.getByText("marker")).toBeInTheDocument();
  });
});

describe("Review order", () => {
  it("moves sections into the fixed order and leaves other content in place", () => {
    render(
      <ChangeTabs
        reviews={[
          {
            Body: body(
              <p key="n">intro note</p>,
              <ReviewDetails key="d">details</ReviewDetails>,
              <TestPlan key="t" items={[]} />,
              <ScenarioResults key="s" scenarios={[]} results={[]} />,
              <ReviewFocus key="f">focus</ReviewFocus>,
              <ActionItems key="a">actions</ActionItems>,
            ),
          },
        ]}
        components={{}}
      />,
    );

    const text =
      screen.getByRole("region", { name: "review" }).textContent ?? "";
    const positions = [
      "intro note",
      "actions",
      "focus",
      "驗收結果",
      "Test plan",
      "details",
    ].map((label) => text.indexOf(label));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
