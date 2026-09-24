import { Children, isValidElement, type ReactNode } from "react";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";

import {
  ActionItems,
  AfterRelease,
  Deviations,
  ReviewDetails,
  ReviewFocus,
} from "@/components/ReviewSections";
import { ScenarioResults, TestPlan } from "@/components/ScenarioCards";

const REVIEW_ORDER: unknown[] = [
  ActionItems,
  ReviewFocus,
  Deviations,
  ScenarioResults,
  TestPlan,
  AfterRelease,
  ReviewDetails,
];

function orderOf(child: ReactNode) {
  const index = isValidElement(child) ? REVIEW_ORDER.indexOf(child.type) : -1;
  return index === -1 ? REVIEW_ORDER.length : index;
}

export function Proposal({ children }: { children: ReactNode }) {
  return (
    <Tab value="Proposal" id="proposal">
      {children}
    </Tab>
  );
}

// Sections render in ADR-0073's order whatever order the page wrote them in.
export function Review({ children }: { children: ReactNode }) {
  const ordered = Children.toArray(children).sort(
    (a, b) => orderOf(a) - orderOf(b),
  );
  return (
    <Tab value="Review" id="review">
      {ordered}
    </Tab>
  );
}

// Server-rendered, so the children still carry the component types to inspect.
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
