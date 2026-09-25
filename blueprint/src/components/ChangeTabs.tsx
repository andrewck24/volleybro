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

// The tabs hold the whole page, so they drop the boxed frame fumadocs gives
// an inline tab set and its padding, and line up with the text. The tab
// list takes no className of its own, so its padding is reached from here.
const FRAME_CLASS =
  "rounded-none border-0 bg-transparent [&>[role=tablist]]:px-0";
const PANEL_CLASS = "px-0 bg-transparent";

function orderOf(child: ReactNode) {
  const index = isValidElement(child) ? REVIEW_ORDER.indexOf(child.type) : -1;
  return index === -1 ? REVIEW_ORDER.length : index;
}

export function Proposal({ children }: { children: ReactNode }) {
  return (
    <Tab value="Proposal" id="proposal" className={PANEL_CLASS}>
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
    <Tab value="Review" id="review" className={PANEL_CLASS}>
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
      className={FRAME_CLASS}
      items={hasReview ? ["Proposal", "Review"] : ["Proposal"]}
      defaultIndex={0}
      updateAnchor
    >
      {children}
    </Tabs>
  );
}
