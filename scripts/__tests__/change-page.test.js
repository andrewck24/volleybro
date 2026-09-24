import assert from "node:assert/strict";
import test from "node:test";

import {
  decisionIds,
  hasReview,
  parseShortstat,
  proposalPart,
  resultIds,
  reviewSections,
  scenarioIds,
} from "../change-page.js";

const PAGE = `---
title: Sample
capabilities: ["platform/blueprint"]
---

export const scenarios = [
  { id: "S1", given: "a", when: "b", then: "c" },
  { id: "S2", given: "d", when: "e", then: "f" },
];

<ChangeTabs>
<Proposal>

<TLDR>Why and what.</TLDR>

<DecisionCards ids={["0072", "0073"]} />

<Scenarios items={scenarios} />

</Proposal>
<Review>

<ActionItems>無</ActionItems>

<ReviewFocus>- one</ReviewFocus>

<Deviations>無</Deviations>

<ScenarioResults
  scenarios={scenarios}
  results={[
    { id: "S1", result: "pass", evidence: "test" },
  ]}
/>

<TestPlan items={[{ id: "T1", checks: "x", method: "y", executor: "agent", environment: "local", result: "pass", evidence: "z" }]} />

<ReviewDetails>detail</ReviewDetails>

</Review>
</ChangeTabs>
`;

test("scenarioIds reads the ids of the exported scenarios", () => {
  assert.deepEqual(scenarioIds(PAGE), ["S1", "S2"]);
});

test("resultIds reads only the ScenarioResults results, not the test plan", () => {
  assert.deepEqual(resultIds(PAGE), ["S1"]);
});

test("decisionIds reads the ids passed to DecisionCards", () => {
  assert.deepEqual(decisionIds(PAGE), ["0072", "0073"]);
});

test("proposalPart is the text between the Proposal tags", () => {
  const part = proposalPart(PAGE);
  assert.match(part, /<TLDR>Why and what\.<\/TLDR>/);
  assert.doesNotMatch(part, /ActionItems/);
});

test("hasReview is true only when a Review tab exists", () => {
  assert.equal(hasReview(PAGE), true);
  assert.equal(hasReview(PAGE.replace(/<Review>[\s\S]*<\/Review>/, "")), false);
});

test("reviewSections lists the Review sections in the order they appear", () => {
  assert.deepEqual(reviewSections(PAGE), [
    "ActionItems",
    "ReviewFocus",
    "Deviations",
    "ScenarioResults",
    "TestPlan",
    "ReviewDetails",
  ]);
});

test("parseShortstat reads files, insertions and deletions", () => {
  assert.deepEqual(
    parseShortstat(" 9 files changed, 221 insertions(+), 39 deletions(-)"),
    { filesChanged: 9, insertions: 221, deletions: 39 },
  );
  assert.deepEqual(parseShortstat(" 1 file changed, 2 insertions(+)"), {
    filesChanged: 1,
    insertions: 2,
    deletions: 0,
  });
  assert.deepEqual(parseShortstat(""), {
    filesChanged: 0,
    insertions: 0,
    deletions: 0,
  });
});

test("hasReview accepts a Review tag with whitespace before its end", () => {
  assert.equal(hasReview(PAGE.replace("<Review>", "<Review >")), true);
  assert.equal(hasReview(PAGE.replace("<Review>", "<Review\n>")), true);
});

test("tags inside fenced code do not count", () => {
  const page = [
    "<ChangeTabs>",
    "<Proposal>",
    "before",
    "",
    "```mdx",
    "</Proposal>",
    "<Review>",
    "```",
    "",
    "after",
    "</Proposal>",
    "</ChangeTabs>",
  ].join("\n");
  assert.match(proposalPart(page), /after/);
  assert.equal(hasReview(page), false);
});

test("scenario and result ids accept quoted keys and ignore look-alikes in text", () => {
  const page = PAGE.replace(
    '{ id: "S1", given',
    '{ "id": "S1", "given"',
  ).replace(
    'evidence: "test" }',
    "evidence: \"see { id: 'S2' } and /> and ];\" }",
  );
  assert.deepEqual(scenarioIds(page), ["S1", "S2"]);
  assert.deepEqual(resultIds(page), ["S1"]);
});

test("a pending result does not count as a result", () => {
  const page = PAGE.replace(
    'result: "pass", evidence: "test"',
    'result: "pending", evidence: "later"',
  );
  assert.deepEqual(resultIds(page), []);
});

test("inline code, tilde and indented fences do not count as tags", () => {
  const page = [
    "<ChangeTabs>",
    "<Proposal>",
    "Tabs are written `<Review>` and `</Proposal>` in the page.",
    "",
    "~~~mdx",
    "</Proposal>",
    "~~~",
    "",
    "  ```",
    "  <Review>",
    "  ```",
    "",
    "after",
    "</Proposal>",
    "</ChangeTabs>",
  ].join("\n");
  assert.match(proposalPart(page), /after/);
  assert.equal(hasReview(page), false);
});

test("entry keys may come in any order", () => {
  const page = PAGE.replace(
    '{ id: "S2", given: "d", when: "e", then: "f" }',
    '{ given: "d", when: "e", id: "S2", then: "f" }',
  ).replace(
    '{ id: "S1", result: "pass", evidence: "test" }',
    '{ evidence: "test", result: "pass", id: "S1" }',
  );
  assert.deepEqual(scenarioIds(page), ["S1", "S2"]);
  assert.deepEqual(resultIds(page), ["S1"]);
});

test("a scenario without an id is reported as missing one", () => {
  const page = PAGE.replace('{ id: "S2", given', "{ given");
  assert.deepEqual(scenarioIds(page), ["S1", undefined]);
});
