import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import { ChangeTabs, Proposal, Review } from "./ChangeTabs";
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

describe("ChangeTabs", () => {
  it("has only a Proposal tab before G2", () => {
    render(
      <ChangeTabs>
        <Proposal>proposal body</Proposal>
      </ChangeTabs>,
    );

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Proposal",
    ]);
  });

  it("opens on Proposal once a Review tab exists", () => {
    render(
      <ChangeTabs>
        <Proposal>proposal body</Proposal>
        <Review>review body</Review>
      </ChangeTabs>,
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
      <ChangeTabs>
        <Proposal>proposal body</Proposal>
        <Review>review body</Review>
      </ChangeTabs>,
    );

    expect(screen.getByRole("region", { name: "review" })).toHaveTextContent(
      "review body",
    );
  });
});

describe("Review", () => {
  it("moves sections into the fixed order and leaves other content in place", () => {
    render(
      <Review>
        <p>intro note</p>
        <ReviewDetails>details</ReviewDetails>
        <TestPlan items={[]} />
        <ScenarioResults scenarios={[]} results={[]} />
        <ReviewFocus>focus</ReviewFocus>
        <ActionItems>actions</ActionItems>
      </Review>,
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
