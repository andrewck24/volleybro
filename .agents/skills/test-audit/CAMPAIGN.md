# Test-pruning campaign

Campaign mode is the shape for a Migration shard that deletes or moves tests:
it prunes one subsystem's whole test surface in one change, such as one
production owner area under `src/` or one `test/integration` suite family. The
value bar, retention bar, candidate evidence, and validation in
[SKILL.md](SKILL.md) apply to every lane. This file adds the order of work and
the lessons of a full campaign. Each step ends on its completion criterion; do
not start the next step early.

The ledger and preservation review below feed the Review tab's deletion table
(`WORKFLOW.md`), which is what the reviewer accepts at G2.

## 1. Baseline

Record the subsystem's test and support line counts and every test file's
pass/fail state at a pinned `dev` SHA. Keep baseline failures in their own
list: in a messaging-integration campaign, all three were real delivery bugs,
not stale tests.

Done when every in-scope test file has a recorded baseline result.

## 2. Lanes and inventory

Split the surface into **lanes** along production owner boundaries, not file
prefixes. For a chat-messaging integration these might be accounts, commands,
context, dispatch, inbound, outbound, persistence, transport, shared, harness,
and live scenarios. Include the subsystem's cases at shared boundaries and its
proof-harness tests.

Done when every test file and scenario the subsystem owns belongs to exactly
one lane.

## 3. Read-only ledger per lane

Give each lane to its own read-only agent. The agent reads every assigned test
in full, including parameter tables. It also reads the production owners and
their entry points, callers, history, and CI routing. Each test declaration
goes into a written **ledger** with one mark. An `it.each` or `test.each` is
one declaration unless its rows need different marks; then mark each row.

- `R`: retain, naming the contract and the bug it catches; a retained test that
  only moves to a better-named file stays `R` with the move noted;
- `F`: retain the contract but repair the assertion, such as a vacuous negative
  that passes when only one of several items is missing;
- `C`: consolidate, naming the owner that absorbs the assertion first: a sibling
  table case, a stronger boundary suite, or the shared owner in another layer;
- `D`: delete, naming the proof that remains, or why no contract exists.

Judge a test by its assertions, not its name. One messaging test named for
retiring a progress window asserted the window was _not_ cleared.

Done when every declaration in the lane has a mark and an evidence line.

## 4. Layer plan per lane

Treat the per-test ledger as input, not as the edit list. A second read-only
pass, starting from the ledger, looks for the redundant **layer**. In the
messaging campaign, several dispatch suites replayed the same shared compositor
through one mocked preview, around stronger real-stream and HTTP-fixture
suites. Name the **keeper** suite for each contract. Prefer the real boundary
with a fake network over a mocked collaborator, within what
`docs/testing-strategy.md` lets that tier replace. Correct any ledger errors
this pass finds.

Done when each lane plan names its retired files, its keeper per contract, the
assertions to carry into keepers, and the test-only production seams unlocked.

## 5. Cutover

Edit lane by lane. Serialize changes to shared harnesses and support files
through one owner. With each lane, remove the test-only production seams it
unlocks: injection parameters, getters, reset exports, and indirection layers.
Update test inventories and any tier or suffix conformance the moved suites
touch (`node scripts/check-workflow.js`). Put durable test-ownership rules in
the subsystem's docs, drawn from mistakes this campaign actually found.

Done when every lane plan is applied and each lane's keepers pass.

## 6. Preservation review

Before claiming completion, have independent reviewers compare deleted
coverage against the keepers, one reviewer per boundary group. They look for
contracts that lost their only proof. They also look for new assertions that
cannot fail, such as a rejection row the production code never reaches. The
messaging review found nine real gaps and one unreachable assertion.

For each restored contract, make one deliberate **mutation** of the production
owner and confirm the keeper goes red. Then restore the source byte for byte.

Done when every reported gap is restored or rejected with source evidence, and
every restored contract has a caught mutation.

## 7. Product defects

A baseline failure that survives into a keeper is a bug report. Fix it at its
owner as a separate commit, and prove it through the real user flow, with a
**control** run that reverts the fix and shows the old behavior. Record
unrelated product discrepancies you find as follow-ups instead of fixing them
in the campaign.

Done when each repaired defect has a failing control and a passing candidate
on the same harness.

## 8. Reconcile and hand off

Campaigns outlive many `dev` commits. Merge `dev` rather than rebasing a
long, many-commit campaign. When `dev` modified a file the campaign
deleted, keep the deletion. Port the new contract into the keeper instead, and
confirm every new regression `dev` added still has a home. Rerun the whole
subsystem suite, `pnpm verify:all`, and any live proof on the merged head.

Expect review tooling to see a truncated file list on a diff this large.

Hand off with the [SKILL.md](SKILL.md) report, plus:

- baseline and final test/support line counts, with production counted separately;
- lanes, retired layers, and keepers;
- preservation gaps found and their mutations;
- product defects with control and candidate proof.
