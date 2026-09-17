---
delivery:
  version: 1
  capabilities:
    sdd:
      adapter: repository-workflow
    change_comprehension:
      adapter: blueprint
    release_planning:
      adapter: linear
      mode: milestone
    versioning:
      adapter: changesets
    workpad:
      adapter: linear-comment
    scm:
      adapter: github
    review:
      adapter: github-pr
    validation:
      adapter: repository-commands
    archive:
      adapter: repository-workflow
    evaluation:
      adapter: symphony
      text_retention: ephemeral
---

# VolleyBro Software Delivery Workflow

This file is VolleyBro's canonical provider-neutral delivery contract. A developer must be able to
run the complete lifecycle manually without Symphony. Symphony may automate an approved execution,
but it does not own requirements, implementation planning, repository validation, or human
acceptance. Provider instruction files are bridges only.

## Repository profile

| Responsibility                         | VolleyBro binding                                                                                                                                                |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Integration branch and default PR base | `dev`                                                                                                                                                            |
| Change branches                        | `feat/<slug>`, `fix/<slug>`, or `refactor/<slug>`                                                                                                                |
| Targeted repository gate               | Narrowest applicable tests, lint, and type checks                                                                                                                |
| Section gate                           | `pnpm verify`                                                                                                                                                    |
| Final gate                             | `pnpm verify:all` — lanes scoped to the diff against `dev`; `--full` runs all                                                                                    |
| Intake and active work                 | Linear issues, statuses, relations, dependencies, priority, milestones                                                                                           |
| Change review surfaces                 | `blueprint/content/changes/<slug>/proposal.mdx`, `delivery.mdx`; gitignored on the Change branch, published to the `blueprint-changes` store branch at each gate |
| Canonical current capability knowledge | `blueprint/content/features/`                                                                                                                                    |
| Execution plan                         | Linear sub-issues under the Change's issue; skipped for a one-session Change                                                                                     |
| Version and changelog evidence         | `.changeset/` through Changesets                                                                                                                                 |
| Provider-neutral workpad               | One persistent Linear comment, kept only by unattended runs                                                                                                      |
| Optional orchestration                 | Symphony run evidence with `ephemeral_text` processing                                                                                                           |

The delivery profile selects responsibilities, not a fixed skill suite. Matt Pocock skills are the
current engineering playbooks; a future compatible skill may replace them without changing the
artifact authority or human gates defined here.

## Repository adapters

Apply installed Matt Pocock playbooks through the repository policies in:

- `docs/agents/issue-tracker.md`;
- `docs/agents/domain.md`;
- `docs/agents/blueprint.md`; and
- `docs/agents/artifact-lifecycle.md`.

Installed Matt skills and their `skills-lock.json` entries are vendor-managed. Do not edit them to
encode VolleyBro policy. Provider bridges point to this contract and the adapters; they do not copy
the lifecycle. When a developer invokes a Matt skill directly inside this repository, these higher-
level repository policies still apply. Lifecycle sequencing and human gates come from this file,
not from an additional workflow skill.

## Authority and retention

- Linear owns intake and current operational state. Issues may be archived or deleted after the
  development lifecycle, so durable repository knowledge must not depend on Linear URLs or IDs.
  Name other work by its Change slug, or by a short description of it when it has no slug yet.
- Blueprint Change pages review the two human gates and, once published, persist as durable review
  history on the `blueprint-changes` store branch; canonical rationale still lives in Feature ADRs,
  PR bodies, and commit bodies. Blueprint does not know which issue tracker is configured.
- Blueprint Features own current capability and sub-capability behavior, constraints, implemented
  or superseded decisions, and revisit triggers.
- Code and tests own actual system behavior.
- Changesets own semantic version and changelog evidence.
- Symphony owns polling, claims, concurrency, retries, isolated workspaces, and structured run
  evidence only when its runtime is enabled.
- Provider prompts, responses, reasoning, and transcripts remain ephemeral and are never required
  for handoff or resumption.

## Linear intake

Manual and Symphony execution use the same intake process. Before creating or materially changing
work, compare relevant open and completed issues, Blueprint Changes and Features, repository docs,
and current code. Decide whether the idea is:

1. an update or duplicate of existing work;
2. one Change that can converge in one discussion;
3. a large, foggy effort that needs a decision map before Change boundaries are known;
4. several independent or dependent Changes; or
5. deferred or out of scope.

Use ordinary issue statuses, parent/child relationships, duplicate relations, and blocking edges to
express intake and wayfinding state. Label taxonomy is intentionally outside this contract and must
not be inferred by agents.

A small, urgent correction may instead follow the Fix path (see Fix path below) rather than becoming
a Change: the agent proposes it during intake and the developer confirms it once, on the tracker
issue.

Adding the `agent:ready` label is the final human arming action for unattended execution; the
developer moves the issue to Todo in the same step so the board shows it is queued. Symphony reads
only the label. Arming never substitutes for an accepted Proposal page, satisfied dependencies, a
resolvable repository route, available capacity, or a healthy provider. Agents never add the label
themselves.

The label and the status change together, each by one owner:

| Moment                              | `agent:ready` | Status      | Owner     |
| ----------------------------------- | ------------- | ----------- | --------- |
| Developer arms unattended execution | added         | Todo        | developer |
| Symphony claims the Change          | kept          | In Progress | Symphony  |
| G1 or G2 waits for the developer    | kept          | In Review   | agent     |
| Developer takes the Change manually | removed       | In Progress | developer |
| Pull request merged                 | removed       | Done        | agent     |

## Lifecycle

Every Change has a stable kebab-case slug and one integration branch. Human-facing titles may
change without changing the slug. Two human gates bound the whole lifecycle: **G1** accepts the
Proposal page before any implementation, and **G2** accepts the Delivery page before the pull
request opens. Everything between a gate and the next runs without stopping for a human.

### 1. Discuss and propose

- **Owner:** developer with an interactive root agent.
- **Input:** an initial idea, intake comparison, repository context, and related operational work.
- **Actions:**
  - use `grill-with-docs` when one focused discussion can clarify requirements, constraints, and
    alternatives;
  - use `wayfinder` when the destination is too large for one session and the decision route is
    still foggy;
  - update stable project-specific terminology in `CONTEXT.md` as soon as it is resolved, while
    keeping specifications and implementation decisions in the active Change;
  - treat Wayfinder items as decision, research, prototype, or clarification work—not executable
    implementation slices;
  - determine whether the result is one Change, several Changes, or no implementation work;
  - once boundaries are clear, use `to-spec` or a compatible replacement to synthesize the
    approved Change into the Proposal page;
  - create or update one structured ADR for each qualifying hard-to-reverse decision; ADRs belong
    to the Proposal page because they capture solution and architecture choices, while its `TLDR`
    may only summarize their product or capability impact;
  - assign each ADR a non-empty `targets` array containing the narrowest affected hierarchical
    capability or sub-capability IDs; use a parent capability only when the decision governs
    multiple children, and list multiple targets when the boundary genuinely crosses them;
  - preserve context, goals/non-goals, scope, capability impact, important rejected alternatives,
    adopted decisions, behavior contracts stated as acceptance scenarios, failure modes, testing
    strategy, and revisit triggers on the Proposal page; add a design mockup (`proposal.tsx`) when
    one clarifies the adopted shape.
- **Exit (G1):** the Proposal page renders complete; publish it with
  `pnpm blueprint:changes:publish <slug>`, then notify the developer and stop for acceptance.
  Acceptance authorizes slice decomposition, implementation, review to a fixed point, and Archive
  to run without stopping again until G2. If the developer instead sends the Change to Ingest (see
  Apply), boundaries or design change and the Proposal page is regenerated for another G1 pass.

### 2. Apply

Apply is the same repository procedure in both execution modes:

1. read the Proposal page, its ADRs, and git state, plus the workpad when an unattended run keeps
   one; a Change that fits one session implements directly, with no slice decomposition — its
   handoff is the branch and its commits. Otherwise decompose the Change into Linear sub-issues
   under the Change's issue, the same way in manual and Symphony mode; the first slice is always
   turning the Proposal's acceptance scenarios into an executable acceptance test;
2. select the next slice whose dependencies are complete;
3. implement through the agreed TDD seam where applicable;
4. run the slice's targeted verification;
5. commit code and tests together;
6. record a self-contained commit body with `Implements`, `Blueprint-Change`, outcome, and
   verification;
7. continue until no eligible slice remains.

The commit body is the canonical slice-to-commit mapping. It travels with the commit through
rebases, which rewrite hashes but preserve bodies, so `git log --grep` reconstructs the mapping at
any time. Blueprint pages therefore reference slices by stable ID and must not pin commit hashes: a
pinned hash is a copy of a fact the commit already states, and every history rewrite silently
invalidates it.

The same-commit rule applies once this contract exists on the branch's base. When this workflow is
first adopted around work that was already committed, or when existing commits are surgically
replayed onto a fresh base, do not rewrite otherwise valid history solely to fabricate compliance.
Before Pre-PR review completes and before developer acceptance, the Delivery page must instead
identify the bootstrap deviation and describe, per completed slice, what was delivered and how it
was verified. This exception ends after the workflow contract lands on the base branch. It does not
license pinning commit hashes, which stay out of Blueprint pages for the reason given above.

Verification failures remain inside Apply. Diagnose whether the implementation is wrong or the
accepted Proposal is no longer viable. Fix implementation defects without creating a separate
stage. Do not silently change accepted behavior, scope, architecture, or acceptance criteria.

#### Optional Ingest action

Ingest is the corrective, developer-authorized step from the former Spectra lifecycle. It is not a
mandatory stage. When the accepted Proposal must materially change:

1. pause Apply;
2. let the developer authorize Ingest;
3. clarify the changed decision, using grilling when needed;
4. update the Proposal page and affected ADRs;
5. preserve completed slices and their evidence;
6. regenerate the Proposal page and return to G1 for re-acceptance;
7. once accepted, resume Apply from where it paused.

### 3. Pre-PR gate and delivery

After all slices complete:

1. run `pnpm verify:all`;
2. evaluate the whole Change for Changeset applicability and the correct semantic version bump, or
   record the applicable repository-defined exemption;
3. run the `code-review` playbook in an independent context against both repository standards and
   the Proposal page, giving the standards reviewer `CONTRIBUTING.md`'s own rules verbatim — an
   independent context knows only what its brief carries;
4. fix every accepted finding, rerun affected targeted checks and `pnpm verify:all`, then repeat
   independent review until both axes reach a fixed point. A round reviews the diff to the
   branch's last commit, so a commit made after one — a fix that unblocks the gate — reopens the
   loop. The fixed point is a reviewed state, not a count of rounds that stopped finding things; it
   is reached when what remains unreviewed is prose describing the review, or a change whose
   content a round specified verbatim. A fix a round merely asked for is not that, however
   precisely it named the defect;
5. proceed to Archive.

The standards axis exists to cover what the repository documents and no tool checks — comment
necessity and density above all, since lint, types and formatting all pass regardless of how much
prose sits in a file. A review that only re-runs the gates is not an independent axis, and an
unwritten standard is one the reviewer cannot apply: state it in `CONTRIBUTING.md` first.

Do not open the pull request before Archive completes and the developer accepts the Delivery page.
Merging still waits for green CI and for whatever the developer said about merging. The repository
does not run an automated review after the pull request opens without an explicit request. Human PR
review and comment fix rounds remain available, but they are optional and the default delivery path
does not wait for comments before merge.

### 4. Archive

Archive runs automatically after Pre-PR review reaches its fixed point, before the pull request
opens. Follow `docs/agents/artifact-lifecycle.md`:

1. promote implemented behavior and durable constraints to the narrowest affected sub-capability;
2. promote each realized ADR from the Proposal page to `blueprint/content/features/`; the
   decision-record contract below owns the numbering and what stays behind;
3. reconcile `CONTEXT.md` only for stable domain terminology resolved during the Change;
4. export a Delivery summary of at most 40 lines — acceptance scenario results, verification,
   findings and fixes, residual risks — for the pull-request body; keep the rest in commit bodies;
5. generate the Delivery page, read every section rendered in a browser as the developer will,
   publish it with `pnpm blueprint:changes:publish <slug>`, then notify the developer and stop for
   acceptance (G2). Reading the source is not reading the page: a stale count, a column that does
   not line up, an unreadable snippet are all invisible in the file that produces them;
6. once accepted, verify tracker neutrality, workflow conformance, and the Features build.

Acceptance of the Delivery page is the last human gate. It authorizes opening the pull request
without asking again: open it with the exported Delivery summary in the body, then wait for CI and
for whatever the developer said about merging. If optional human PR feedback arrives and changes
durable knowledge, amend the promoted Features and reopen the branch to fix it, then rerun
the applicable gates on the same branch. After merge, move the operational Linear issue to Done;
merge performs no second knowledge sync. Historical Spectra/OpenSpec artifacts remain historical
snapshots. A later low-priority migration promotes only knowledge that is still current; it does
not rewrite the remaining snapshots.

## Implementation-slice contract

Canonical execution data is one Linear sub-issue per slice, under the Change's operational issue,
the same way in manual and Symphony mode. A Change that fits one session skips slices entirely and
implements directly; its handoff is the branch and its commits. Each slice states a stable ID,
capability references, dependencies, outcome, acceptance criteria, verification, and status
(`pending` or `completed`). Runtime states such as `claimed`, `running`, executor identity, and
retry count do not belong on the sub-issue.

```text
blueprint/content/changes/<slug>/       gitignored on the Change branch; published to the
                                         blueprint-changes store branch at each gate
├── proposal.mdx
├── proposal.tsx                        optional interactive design mockup
├── proposal/
│   └── decisions/
│       └── D01-<decision>.json         proposed ADRs; promoted to Features at Archive
└── delivery.mdx
```

### Change scope

A Change targets soft limits before it needs splitting: at most 5 slices, at most 30 changed `src`
files, and at most 8 acceptance scenarios on the Proposal page. Exceeding a target at Proposal time
means splitting into multiple Changes rather than writing a larger one. The slice count is a
written target only: slices are Linear sub-issues now, so `check-workflow.js` cannot count them and
does not warn on this one. The exported Delivery summary targets at most 40 lines in the
pull-request body; anything beyond that stays in commit bodies.

A Change is either a **structure** change (a behavior-preserving refactor, whose acceptance is the
existing test suite plus a dependency-direction check) or a **behavior** change, never both.

The escape hatch is a **Migration Change**: one Proposal page, accepted once at G1, covering the
whole migration — its shard list, order, per-shard proof of behavior preservation, and completion
criteria. Each shard afterward is its own Change and pull request, references the Migration
Proposal's slug, skips G1, and goes straight to G2. A single Linear tracking issue links every
shard. The Migration Proposal's ADR is promoted to Features once, when the first shard archives;
the remaining shards do not repeat it. `check-workflow.js` counts changed `src` files against
`dev` and Proposal scenarios, and warns, rather than fails, past either target. The `src`-file-count
warning is suppressed by a `Migration: <migration-slug>` commit trailer (or
`pnpm check:workflow --migration <slug>`), not by a PR-body reference.

### Fix path

A third path exists beside the normal Change and the Migration Change, for a fix too urgent or too
small to carry Proposal and Delivery pages.

1. Applies when the fix restores behavior Features already describe, or is a small change with no
   behavior change (docs, config, a minor dependency bump); it creates no new ADR or behavior
   contract, fits in one session, and stays within the soft size targets above.
2. The agent proposes the fix path during intake; the developer confirms it once, on the tracker
   issue.
3. Kept: a failing test that reproduces the bug before the fix (when it is a bug), `pnpm verify:all`,
   the two-axis code review with the issue as the spec, and a Changeset when applicable.
4. Skipped: G1, the Proposal and Delivery pages, publishing, slices, and Archive promotion.
5. The only human gate is the pull request: its body names the fix path and carries a short
   verification summary; merging is acceptance.
6. Escalate to a normal Change — write the Proposal, pass G1 — as soon as the fix needs a new
   behavior contract or ADR, or Features turn out to describe the behavior wrongly.
7. Commits on the fix path carry a `Refs: <tracker issue>` trailer and omit `Implements` and
   `Blueprint-Change`.
8. A single-commit fix squashes into `dev` as usual. A multi-commit fix merges with a merge commit,
   the same as a normal Change; if it is squashed instead, the squash commit keeps the `Refs`
   trailer.

## Decision-record contract

ADRs live on the Proposal page under `proposal/decisions/` because they explain solution and
architecture choices; the TLDR may summarize their capability impact but must not become a second
ADR source. An ADR sitting in a Change directory is proposed; the same record copied into
`blueprint/content/features/` is adopted. There is no separate status field — the directory it sits
in says which.

Every ADR declares `targets` while it is first drafted. Each target is a hierarchical capability ID
such as `game-recording/rally-input`; it identifies the expected promotion destination and makes
the affected boundary reviewable at G1. Archive reconciles these targets against delivered behavior
before copying the record, rather than treating an early target as irrevocable.

Decision JSON conforms to `blueprint/schemas/decision-record.schema.json` and preserves the same
human-review information used by the Proposal page: stable ID and title, decision body, and
rejected options with rationale. It additionally records targets, context, consequences, and
revisit triggers. `DecisionTimeline` renders these records on the Proposal and Feature pages;
rendering never becomes a second editable decision source.

Archive copies each realized ADR to
`blueprint/content/features/<capability>/<sub-capability>/decisions/`. The Feature copy becomes
canonical current knowledge. A later Change that replaces it sets `supersededBy` on the Feature
copy to the replacing Feature ADR, without editing the proposed record. That record does not
disappear — it stays with the published Proposal page on the `blueprint-changes` store branch; the
Feature copy is the current authority.

A promoted record is renumbered, because the two copies answer to different namespaces. On the
Proposal page, `D3` means the third decision of that piece of reasoning, and that numbering stops
being citable once the Change directory is regenerated for the next gate, even though the page
itself persists on the store branch. Inside Features it has to be unique across everything promoted
so far, so Archive assigns the next free number in **one sequence spanning the whole Features
tree** and records where the record came from in `originChange` and `originDecision`. Citing the
Proposal's own numbering only works while the Change is still open; the Feature number is the only
citation that survives Archive.

The sequence is global rather than per capability because one ADR may target several. Numbering per
capability would give a single decision two numbers, and a decision is one entry however many pages
index it. The number says nothing about which capability it governs; the directory it sits in does.

## Branch and commit strategy

One Change uses one integration branch from the first slice commit through delivery. Each completed
slice is a separate reviewable commit; use temporary slice branches only when truly independent
work must run in parallel, then integrate them back into the Change branch before final
verification.

Proposal-page content never enters the Change branch — it lives only in the regenerated, gitignored
Change directory and is published to the `blueprint-changes` store branch at each gate. Push the
Change branch when another session or Symphony must resume it.

Merge a Change into `dev` with a merge commit. Squashing collapses the per-slice commits and
discards the `Implements` and `Blueprint-Change` trailers that make delivery traceable, which is
exactly the evidence Pre-PR review and Archive depend on. Squash only work that carries no slice
history — a single-commit fix or a tooling change — and say so in the pull request.

## Execution modes

### Manual workflow

The developer invokes Apply directly after accepting the Proposal page at G1. Resume from
repository artifacts, git state, and verification evidence. No Symphony process, claim, dashboard,
or workspace manager is required.

Before Manual Apply starts for an issue that may be visible to Symphony:

1. inspect the configured Symphony status surface for the issue identifier; `running`, `retrying`,
   and `blocked` all mean Symphony still owns a live claim, so stop rather than entering the same
   Change workspace manually;
2. if the issue is not tracked by Symphony, the developer removes `agent:ready` and moves the issue
   to In Progress to prevent a future unattended claim;
3. request a Symphony refresh when the runtime is available, then inspect the issue status again;
4. begin Manual Apply only when the issue remains absent from the runtime status surface after
   that post-removal check.

The second status check closes the race between the initial observation and the status change. If
a claim appears during that window, removing the label makes the issue unroutable and Symphony
reconciliation must release or stop it before Manual Apply proceeds. Agents never remove or restore
the label on the developer's behalf, and completion of Manual Apply never restores it automatically.

### Symphony workflow

After G1 acceptance, the developer may add `agent:ready` and move the issue to Todo.
Symphony claims the Change's operational issue, creates or resumes an isolated workspace, and
invokes the same Apply contract. The current dispatch unit is one Change; Symphony does not claim
individual slice sub-issues.

Removing or replacing Symphony must not alter Change artifacts, slice status semantics, commits, or
human approval gates.

## Workpad and handoff

An unattended (Symphony) run maintains one persistent workpad for the active Change, so a stopped
run can be resumed by another and an unblock action has somewhere to wait for the developer:

```yaml
change: stable-change-slug
branch: feat/stable-change-slug
phase: apply | ingest | pre-pr | archive
current_slice: S01 | null
completed: []
validation: []
blockers: []
next_action: "smallest concrete continuation step"
```

The workpad may include tracker, run, workspace, commit, and pull-request references while they are
active. Blueprint must not copy those tracker-specific references into its durable content.

A manual run keeps a lighter workpad: every field above except `blockers` and `next_action` is
already recorded in the repository — slice status on the Linear sub-issues, validation in commit
trailers — and a copy kept by hand drifts from them. A multi-session manual run hands off through
the pushed branch and its commits plus the sub-issues, so another agent, worktree, or machine can
pick up where the run stopped without a separate handoff file.

## Blueprint knowledge contract

Proposal and Delivery pages are written under gitignored `blueprint/content/changes/<slug>/` on the
Change branch and published to the `blueprint-changes` store branch at each gate — the durable store
of every Change page, old and new, that never merges into other branches.
`pnpm --filter blueprint dev` and `build` first run `pnpm blueprint:changes:pull`, so every deploy
carries all published Changes plus Features and the Design System from the deployed branch.

- **Proposal:** context, goals/non-goals, Change boundaries and dependency direction, behavior
  contract, acceptance scenarios, structured ADRs, design mockup, and risks.
- **Delivery:** acceptance scenario results, verification, review findings and fixes, boundary-
  relevant diffs, and residual risks.
- **Features:** current capability and sub-capability behavior, constraints, implemented/superseded
  decision copies, and long-term evolution—not active execution status.

Provider-native subagents remain within one root session and Change workspace. They never poll or
claim the external queue, arm unattended execution, reprioritize intake, or create a parallel
lifecycle authority.

### Presentation

Blueprint pages exist to be read by a human deciding whether to accept a gate, so structure a
reader can scan is part of the artifact rather than decoration. Prose alone is insufficient wherever
the information is spatial, comparative, or ranked by severity: no paragraph shows at a glance which
files changed, which finding blocks acceptance, or which line a fix landed on.

Render such information with the components the repository already has, rather than describing it:

| Information                                          | Component              |
| ---------------------------------------------------- | ---------------------- |
| The page's claim, before any detail                  | `TLDR`                 |
| A behavior stated as given / when / then             | `Scenario`             |
| What changed per file, or a term-by-term walkthrough | `FileTour`             |
| Before and after of a specific edit                  | `AnnotatedDiff`        |
| Risks or review findings, ranked by severity         | `RiskTable`            |
| A process whose steps a reader may want to open      | `InteractiveFlowchart` |
| Structured decision records                          | `DecisionTimeline`     |

Minimum per page: Proposal opens with `TLDR`, states acceptance criteria as `Scenario` blocks,
carries at least one diagram of the adopted shape or a mockup, and states risks through
`RiskTable`; Delivery opens with `TLDR`, shows acceptance results and verification as tables,
findings through `RiskTable`, and boundary-relevant fixes as `AnnotatedDiff`.

Five rules bind this:

- A component earns its place by carrying structure prose cannot. The narrative that explains _why_
  still belongs beside it, and a page that is only components has lost the argument.
- Components render data and never become a second source for it. A page must not restate what the
  page shell already renders from the slice sub-issues or the decision records.
- Diagrams are part of the specification, not illustrations of it. When delivery diverges from what
  a diagram shows, the diagram is corrected in the same round as the text.
- Use an ordered list wherever items are referred to by number elsewhere on the page.
- Change pages are gitignored on the Change branch and published to the `blueprint-changes` store
  branch at each gate, where they persist as durable review history; the PR body still carries the
  ≤40-line Delivery summary, and ADRs still promote to Features.
