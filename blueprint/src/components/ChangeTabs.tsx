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

export function Review({ children }: { children: ReactNode }) {
  const nodes = Children.toArray(children);
  const slots = nodes.flatMap((node, index) =>
    orderOf(node) < REVIEW_ORDER.length ? [index] : [],
  );
  const sections = slots
    .map((index) => nodes[index])
    .sort((a, b) => orderOf(a) - orderOf(b));
  slots.forEach((slot, i) => {
    nodes[slot] = sections[i];
  });
  return (
    <Tab value="Review" id="review">
      {nodes}
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
