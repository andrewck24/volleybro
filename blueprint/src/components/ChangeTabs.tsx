import { Children, isValidElement, type ReactNode } from "react";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";

export function Proposal({ children }: { children: ReactNode }) {
  return (
    <Tab value="Proposal" id="proposal">
      {children}
    </Tab>
  );
}

export function Review({ children }: { children: ReactNode }) {
  return (
    <Tab value="Review" id="review">
      {children}
    </Tab>
  );
}

// ADR-0072: the page opens on Proposal, and the Review tab exists only once
// the page has one (from G2). Server-rendered, so the children still carry
// the Proposal and Review component types to inspect.
export function ChangeTabs({ children }: { children: ReactNode }) {
  const hasReview = Children.toArray(children).some(
    (child) => isValidElement(child) && child.type === Review,
  );
  return (
    <Tabs
      items={hasReview ? ["Proposal", "Review"] : ["Proposal"]}
      defaultIndex={0}
      updateAnchor
    >
      {children}
    </Tabs>
  );
}
