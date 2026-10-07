import {
  Children,
  Fragment,
  isValidElement,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";

import { FigureBadges } from "@/components/FigureBadges";
import {
  ActionItems,
  AfterRelease,
  Deviations,
  ReviewDetails,
  ReviewFocus,
} from "@/components/ReviewSections";
import { ScenarioResults, TestPlan } from "@/components/ScenarioCards";
import type { ChangeFacts } from "@/lib/change-meta";

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

export type TabBody = ComponentType<{ components?: Record<string, unknown> }>;

export type ReviewTab = {
  shard?: number;
  Body: TabBody;
  facts?: ChangeFacts;
};

function orderOf(child: ReactNode) {
  const index = isValidElement(child) ? REVIEW_ORDER.indexOf(child.type) : -1;
  return index === -1 ? REVIEW_ORDER.length : index;
}

// Sections sort into the order ADR-0073 sets; anything else keeps its place.
function inReviewOrder(children: ReactNode) {
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
  return nodes;
}

// A tab comes from the store branch and can reference something this checkout
// lacks. Calling it as a function keeps its throw on this call stack, where it
// becomes a message in that tab alone (ADR-0094); a React error boundary would
// not run during static export.
function renderTab(
  Body: TabBody,
  components: Record<string, unknown>,
  label: string,
) {
  try {
    const rendered = (Body as (props: object) => ReactElement)({ components });
    // Unwrap the fragment an MDX file renders, so the Review can order its
    // sections.
    const content =
      isValidElement<{ children?: ReactNode }>(rendered) &&
      rendered.type === Fragment
        ? rendered.props.children
        : rendered;
    return { content, hasError: false };
  } catch (error) {
    console.error(`Change tab "${label}" failed to render:`, error);
    const content = (
      <p className="text-sm text-destructive-text">
        此分頁（{label}）在此 checkout 中無法顯示：
        {error instanceof Error ? error.message : String(error)}
      </p>
    );
    return { content, hasError: true };
  }
}

export function reviewLabel(shard: number | undefined) {
  return shard === undefined ? "Review" : `Shard ${shard}`;
}

export function ChangeTabs({
  Proposal,
  reviews,
  components,
}: {
  Proposal?: TabBody;
  reviews: ReviewTab[];
  components: Record<string, unknown>;
}) {
  const labels = ["Proposal", ...reviews.map((tab) => reviewLabel(tab.shard))];
  const proposal = Proposal
    ? renderTab(Proposal, components, "Proposal")
    : { content: null, hasError: false };
  const renderedReviews = reviews.map((tab) => ({
    ...tab,
    label: reviewLabel(tab.shard),
    ...renderTab(tab.Body, components, reviewLabel(tab.shard)),
  }));
  const hasRenderError =
    proposal.hasError || renderedReviews.some((tab) => tab.hasError);
  return (
    <>
      {hasRenderError && <span hidden data-blueprint-render-error="true" />}
      <Tabs
        className={FRAME_CLASS}
        items={labels}
        defaultIndex={0}
        updateAnchor
      >
        <Tab value="Proposal" id="proposal" className={PANEL_CLASS}>
          {proposal.content}
        </Tab>
        {renderedReviews.map(({ shard, content, facts, label }) => {
          return (
            <Tab
              key={label}
              value={label}
              id={shard === undefined ? "review" : `review-s${shard}`}
              className={PANEL_CLASS}
            >
              {facts && (
                <div className="not-prose mb-4">
                  <FigureBadges facts={facts} />
                </div>
              )}
              {inReviewOrder(content)}
            </Tab>
          );
        })}
      </Tabs>
    </>
  );
}
