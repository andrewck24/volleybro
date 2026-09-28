import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  decisionIds,
  inlineReviewSections,
  parseShortstat,
  readChangeDir,
  resultIds,
  reviewFile,
  reviewSections,
  scenarioIds,
  scenarios,
  shardCount,
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

<ActionItems>

無

</ActionItems>

<ReviewFocus>

- one

</ReviewFocus>

<Deviations>

無

</Deviations>

<ScenarioResults
  scenarios={scenarios}
  results={[
    { id: "S1", result: "pass", evidence: "test" },
  ]}
/>

<TestPlan items={[{ id: "T1", checks: "x", method: "y", executor: "agent", environment: "local", result: "pass", evidence: "z" }]} />

<ReviewDetails>

detail

</ReviewDetails>

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

test("sections in inline code or fences do not count", () => {
  const review = [
    "Sections are written `<ActionItems>` in the file.",
    "",
    "~~~mdx",
    "<ReviewFocus>",
    "~~~",
    "",
    "```mdx",
    "<Deviations>",
    "```",
  ].join("\n");
  assert.deepEqual(reviewSections(review), []);
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

test("backtick and multi-line template values are read like any string", () => {
  const page = PAGE.replace(
    '{ id: "S2", given: "d", when: "e", then: "f" }',
    '{ id: `S2`, given: "d", when: "e", then: `f\n]} still f` }',
  ).replace(
    'result: "pass", evidence: "test"',
    "result: `pending`, evidence: `later`",
  );
  assert.deepEqual(scenarioIds(page), ["S1", "S2"]);
  assert.deepEqual(resultIds(page), []);
});

test("only an entry's own id counts, not one nested inside it", () => {
  const page = PAGE.replace(
    '{ id: "S2", given: "d", when: "e", then: "f" }',
    '{ given: "d", when: "e", then: "f", meta: { id: "X" } }',
  );
  assert.deepEqual(scenarioIds(page), ["S1", undefined]);
});

test("results are found even after a prop containing =>", () => {
  const page = PAGE.replace(
    "<ScenarioResults\n  scenarios={scenarios}",
    "<ScenarioResults\n  render={(x) => x}\n  scenarios={scenarios}",
  );
  assert.deepEqual(resultIds(page), ["S1"]);
});

test("a Review section written on one line is reported as inline", () => {
  const page = PAGE.replace(
    "<Deviations>\n\n無\n\n</Deviations>",
    "<Deviations>無</Deviations>",
  );
  assert.deepEqual(inlineReviewSections(page), ["Deviations"]);
  assert.equal(reviewSections(page).includes("Deviations"), false);
});

test("only pass and fail count as results", () => {
  for (const value of ['"todo"', "status", "`${s}`"]) {
    const page = PAGE.replace('result: "pass"', `result: ${value}`);
    assert.deepEqual(resultIds(page), [], value);
  }
  const noResult = PAGE.replace('result: "pass", ', "");
  assert.deepEqual(resultIds(noResult), []);
});

test("scenarios built by spread or from a variable read as malformed", () => {
  const spread = PAGE.replace(
    "export const scenarios = [",
    "export const base = [];\nexport const scenarios = [\n  ...base,",
  );
  assert.ok(scenarioIds(spread).includes(undefined));
  const aliased = PAGE.replace(
    /export const scenarios = \[[\s\S]*?\];/,
    "export const base = [];\nexport const scenarios = base;",
  );
  assert.deepEqual(scenarioIds(aliased), [undefined]);
});

test("frontmatter is not parsed as MDX, whatever it contains", () => {
  const page = PAGE.replace(
    "title: Sample",
    "title: <name>\ndescription: 用 <Review> tab 呈現 {x}",
  );
  assert.doesNotThrow(() => scenarioIds(page));
});

test("a scenario's shard is read as a number", () => {
  const proposal =
    'export const scenarios = [\n  { id: "S1", shard: 2, given: "a", when: "b", then: "c" },\n];\n';
  assert.deepEqual(
    scenarios(proposal).map(({ id, shard }) => [id, shard]),
    [["S1", 2]],
  );
});

test("shardCount reads a Migration's shard count from the frontmatter", () => {
  assert.equal(shardCount("---\ntitle: M\nshards: 4\n---\n"), 4);
  assert.equal(shardCount("---\ntitle: C\n---\n"), undefined);
  assert.equal(shardCount(undefined), undefined);
});

test("readChangeDir reads the index, the Proposal and every Review in shard order", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "change-dir-"));
  for (const [name, content] of [
    ["index.mdx", "---\ntitle: M\nshards: 2\n---\n"],
    ["proposal.mdx", "p"],
    [reviewFile(2), "second"],
    [reviewFile(1), "first"],
    ["facts.json", "{}"],
    ["design.tsx", "export {}"],
  ]) {
    await writeFile(path.join(dir, name), content);
  }
  const page = await readChangeDir(dir);
  assert.equal(page.proposal, "p");
  assert.deepEqual(
    page.reviews.map(({ shard, file, content }) => [shard, file, content]),
    [
      [1, "review-s1.mdx", "first"],
      [2, "review-s2.mdx", "second"],
    ],
  );
  assert.equal(reviewFile(undefined), "review.mdx");
});
