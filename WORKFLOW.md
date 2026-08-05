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

| Responsibility                         | VolleyBro binding                                                      |
| -------------------------------------- | ---------------------------------------------------------------------- |
| Integration branch and default PR base | `dev`                                                                  |
| Change branches                        | `feat/<slug>`, `fix/<slug>`, or `refactor/<slug>`                      |
| Targeted repository gate               | Narrowest applicable tests, lint, and type checks                      |
| Section gate                           | `pnpm verify`                                                          |
| Final gate                             | `pnpm verify:all`                                                      |
| Intake and active work                 | Linear issues, statuses, relations, dependencies, priority, milestones |
| Change-scoped durable knowledge        | `blueprint/content/changes/<status>/<slug>/`                           |
| Canonical current capability knowledge | `blueprint/content/features/`                                          |
| Execution plan                         | Change-local implementation-slice JSON                                 |
| Version and changelog evidence         | `.changeset/` through Changesets                                       |
| Provider-neutral workpad               | One persistent Linear comment for the active Change                    |
| Optional orchestration                 | Symphony run evidence with `ephemeral_text` processing                 |

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
- Blueprint Changes own durable rationale, adopted design, implementation slices, lifecycle, and
  human review presentation. Blueprint does not know which issue tracker is configured.
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
express intake and wayfinding state. Label taxonomy other than the exact `agent:ready` dispatch gate
is intentionally outside this contract and must not be inferred by agents.

`agent:ready` is the final human arming action for unattended execution. It never substitutes for
approved repository artifacts, satisfied dependencies, a resolvable repository route, available
capacity, or a healthy provider. Agents never add it.

## Lifecycle

Every Change has a stable kebab-case slug and one integration branch. Human-facing titles may
change without changing the slug.

### 1. Discuss

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
  - determine whether the result is one Change, several Changes, or no implementation work.
- **Exit:** Change boundaries and the next clarification or proposal action are explicit in Linear.

### 2. Propose

- **Entry:** the developer authorizes proposal after discussion converges.
- **Actions:**
  - use `to-spec` or a compatible replacement to synthesize the approved Change;
  - create or update Blueprint Overview and Design;
  - create or update one structured ADR for each qualifying hard-to-reverse decision under the
    Change's Design scope; ADRs belong to Design because they capture solution and architecture
    choices, while Overview may only summarize their product or capability impact;
  - assign each candidate ADR a non-empty `targets` array containing the narrowest affected
    hierarchical capability or sub-capability IDs; use a parent capability only when the decision
    governs multiple children, and list multiple targets when the boundary genuinely crosses them;
  - preserve context, goals/non-goals, scope, capability impact, important rejected alternatives,
    adopted decisions, behavior contracts, failure modes, testing strategy, and revisit triggers;
  - commit Overview and Design on the Change branch before execution preparation.
- **Exit:** the proposed behavior and design are internally consistent and ready for decomposition.

### 3. Prepare execution

This stage follows Propose automatically.

- Use `to-slices`, implemented as a repository adapter over ticket-decomposition skills, to create
  vertical implementation slices under the active Blueprint Change.
- Each slice has a stable ID, capability references, dependencies, outcome, acceptance criteria,
  verification, and durable status.
- Commit the complete slice plan separately from source implementation.
- Set the Change lifecycle to `ready-for-review`, render the slices in Blueprint, and stop for human
  review.
- Human approval changes the lifecycle to `ready-for-implementation`. Prepare execution never adds,
  removes, or otherwise updates `agent:ready`; the developer may add it manually only after the
  Blueprint plan is approved and unattended execution is desired.
- At approval, qualifying hard-to-reverse Change ADRs move from `candidate` to `accepted`. They remain
  Change-scoped and must not be copied into Features before implementation is verified at Archive.

### 4. Apply

Apply is the same repository procedure in both execution modes:

1. set the Change lifecycle to `applying`, then read Overview, Design, implementation plan, current
   capability references, workpad, and git state;
2. select the next `pending` slice whose dependencies are `completed`;
3. implement through the agreed TDD seam where applicable;
4. run the slice's targeted verification;
5. change the slice status to `completed`;
6. commit code, tests, and the completed slice JSON together;
7. record a self-contained commit body with `Implements`, `Blueprint-Change`, outcome, and
   verification;
8. continue until no eligible pending slice remains.

The same-commit rule applies once this contract exists on the branch's base. When this workflow is
first adopted around work that was already committed, or when existing commits are surgically
replayed onto a fresh base, do not rewrite otherwise valid history solely to fabricate compliance.
Before Pre-PR review, Blueprint Review must instead identify the bootstrap deviation and provide a
durable mapping from every completed slice to its actual implementation commits and verification.
This exception ends after the workflow contract lands on the base branch.

Verification failures remain inside Apply. Diagnose whether the implementation is wrong or the
approved design is no longer viable. Fix implementation defects without creating a separate stage.
Do not silently change approved behavior, scope, architecture, or acceptance criteria.

#### Optional Ingest action

Ingest is the corrective, developer-authorized step from the former Spectra lifecycle. It is not a
mandatory stage. When the approved plan must materially change:

1. pause Apply;
2. let the developer authorize Ingest and set the Change lifecycle to `ingesting`;
3. clarify the changed decision, using grilling when needed;
4. update the active spec, Blueprint Overview or Design, and affected slices;
5. preserve completed slices and their evidence;
6. commit the ingested plan changes and obtain human approval;
7. set the lifecycle back to `applying` and resume Apply.

### 5. Pre-PR gate and delivery

After all slices complete:

1. set the Change lifecycle to `pre-pr-review`, then run `pnpm verify:all`;
2. evaluate the whole Change for Changeset applicability and the correct semantic version bump, or
   record the applicable repository-defined exemption;
3. run the `code-review` playbook in an independent context against both repository standards and
   the approved Change specification;
4. fix every accepted finding, rerun affected targeted checks and `pnpm verify:all`, then repeat
   independent review until both axes reach a fixed point;
5. update Blueprint Review after each round with actual delivery, verification, findings, fixes,
   plan-versus-actual differences, residual risks, and follow-ups; and
6. set the Change lifecycle to `awaiting-delivery-review`, notify the developer, and stop for
   acceptance of Blueprint Review.

Do not open the pull request before developer acceptance and branch-local Archive. The repository
does not run an automated Claude review after the pull request opens. Human PR review and comment
fix rounds remain available, but they are optional and the default delivery path does not wait for
comments before merge.

### 6. Archive

Archive runs on the Change branch after the developer accepts Blueprint Review and before the pull
request opens. Follow `docs/agents/artifact-lifecycle.md`:

1. reconcile Overview, Design, implementation slices, and Review with delivered code and tests;
2. promote implemented behavior and durable constraints to the narrowest affected sub-capability;
3. reconcile each realized Change ADR, change its status from `accepted` to `implemented`, then copy
   it to the narrowest affected Feature capability or sub-capability as canonical current knowledge;
   preserve the original ADR in the archived Change together with rejected alternatives, rationale,
   consequences, and revisit triggers;
4. reconcile `CONTEXT.md` only for stable domain terminology resolved during the Change;
5. keep execution slices, review rounds, validation evidence, and plan-versus-actual history in the
   archived Change rather than copying them into Features;
6. set lifecycle to `archived`, add `archivedAt`, and move the complete Change to
   `blueprint/content/changes/archive/YYYY-MM-DD-<slug>/` without changing its stable metadata
   `slug`; and
7. verify tracker neutrality, workflow conformance, and the Blueprint build.

Open the pull request only after the Archive commit. If optional human PR feedback arrives and
changes durable knowledge, amend the archived Change and promoted authorities on the same branch
and rerun the applicable gates. After merge, move the operational Linear issue to Done; merge
performs no second knowledge sync. Historical Spectra/OpenSpec artifacts remain historical
snapshots. A later low-priority migration promotes only knowledge that is still current; it does not
rewrite the remaining snapshots.

## Implementation-slice contract

Canonical execution data is JSON; MDX and React components render it for human review.

```text
blueprint/content/changes/<status>/<change-slug>/
├── meta.json
├── index.mdx
├── design.mdx
├── design.tsx                  optional interactive design
├── design/
│   └── decisions/
│       └── D001-<decision>.json
├── implementation.mdx         rendered review page
├── implementation/
│   ├── plan.json
│   └── slices/
│       ├── S01-<name>.json
│       └── S02-<name>.json
└── review.mdx
```

Durable slice statuses are `pending`, `completed`, and `superseded`. Runtime states such as
`claimed`, `running`, executor identity, and retry count do not belong in Git and must not be added
to slice files.

Implementation slices remain Change artifacts. Feature pages receive only durable current
behavior, constraints, and decisions; they do not receive execution checklists.

## Decision-record contract

Change ADRs live under `design/decisions/` because they explain solution and architecture choices;
Overview may summarize their capability impact but must not become a second ADR source. Their active
lifecycle is `candidate` during Propose, `accepted` after developer plan approval, and `implemented`
only when Archive verifies the delivered decision.

Every ADR declares `targets` while it is first drafted. Each target is a hierarchical capability ID
such as `game-recording/rally-input`; it identifies the expected promotion destination and makes the
affected boundary reviewable during Propose. Archive reconciles these targets against delivered
behavior before copying the record, rather than treating an early target as irrevocable.

Decision JSON conforms to `blueprint/schemas/decision-record.schema.json` and preserves the same
human-review information used by interactive Design pages: stable ID and title, decision body, and
rejected options with rationale. It additionally records lifecycle status, targets, context,
consequences, and revisit triggers. `DecisionTimeline` renders these records in Design and Feature
knowledge pages; rendering never becomes a second editable decision source.

Archive retains each reconciled ADR in the complete Change and copies the implemented record to
`blueprint/content/features/<capability>/<sub-capability>/decisions/`. The Feature copy records the
origin Change slug and becomes canonical current knowledge. Later Changes may mark that Feature copy
`superseded` without editing the historical ADR in the archived Change.

## Branch and commit strategy

One Change uses one integration branch from Propose through delivery. Propose, execution
preparation, lifecycle approval, and each completed slice are separate reviewable commits. Use
temporary slice branches only when truly independent work must run in parallel, then integrate them
back into the Change branch before final verification.

Do not create a separate planning branch and do not merge proposal artifacts into `dev` before the
Change is delivered. Push the Change branch when another session or Symphony must resume it.

## Execution modes

### Manual workflow

The developer invokes Apply directly after approving the Blueprint plan. Resume from repository
artifacts, the persistent workpad, git state, and verification evidence. No Symphony process,
claim, dashboard, or workspace manager is required.

Before Manual Apply starts for an issue that may be visible to Symphony:

1. inspect the configured Symphony status surface for the issue identifier; `running`, `retrying`,
   and `blocked` all mean Symphony still owns a live claim, so stop rather than entering the same
   Change workspace manually;
2. if the issue is not tracked by Symphony, the developer removes `agent:ready` to prevent a future
   unattended claim;
3. request a Symphony refresh when the runtime is available, then inspect the issue status again;
4. begin Manual Apply only when the issue remains absent from the runtime status surface after that
   post-removal check.

The second status check closes the race between the initial observation and label removal. If a
claim appears during that window, label removal makes the issue unroutable and Symphony
reconciliation must release or stop it before Manual Apply proceeds. Agents and Prepare execution
never remove `agent:ready` on the developer's behalf, and completion of Manual Apply never restores
the label automatically.

### Symphony workflow

After plan approval, the developer may add `agent:ready`. Symphony claims the Change's operational
issue, creates or resumes an isolated workspace, and invokes the same Apply contract. The current
dispatch unit is one Change; Symphony does not claim individual slice JSON files.

Removing or replacing Symphony must not alter Change artifacts, slice status semantics, commits, or
human approval gates.

## Workpad and handoff

Maintain one persistent workpad for the active Change with:

```yaml
change: stable-change-slug
branch: feat/stable-change-slug
phase: discuss | propose | prepare-execution | apply | ingest | pre-pr | review | archive
execution_mode: manual | symphony
current_slice: S01 | null
completed: []
validation: []
blockers: []
next_action: "smallest concrete continuation step"
```

The workpad may include tracker, run, workspace, commit, and pull-request references while they are
active. Blueprint must not copy those tracker-specific references into its durable content.

## Blueprint knowledge contract

- **Overview:** context, goals/non-goals, Change boundaries, capability impact, alternatives,
  decision rationale, and revisit triggers.
- **Design:** adopted behavior and architecture, contracts, failure modes, data and interaction
  flows, testing strategy, trade-offs, risks, and structured Change-scoped ADRs.
- **Implementation:** repository-native vertical slices and dependency/progress visualization.
- **Review:** actual delivery, plan-versus-actual, validation, review findings and fixes, rollout,
  residual risks, and follow-ups.
- **Features:** current capability and sub-capability behavior, constraints, implemented/superseded
  decision copies, and long-term evolution—not active execution status.

Provider-native subagents remain within one root session and Change workspace. They never poll or
claim the external queue, arm unattended execution, reprioritize intake, or create a parallel
lifecycle authority.
