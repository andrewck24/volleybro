## ADDED Requirements

### Requirement: Repository-owned canonical delivery contract

The repository documentation layer SHALL provide a self-contained root `WORKFLOW.md` that defines intake, proposal, readiness, implementation, validation, review, handoff, merge, and archive behavior without requiring workstation-global files.

#### Scenario: A fresh checkout discovers the full lifecycle

- **WHEN** a developer or agent opens a fresh VolleyBro checkout
- **THEN** the root workflow contract contains every delivery phase and its exit gate

### Requirement: Readiness-gated scheduler dispatch

The workflow documentation layer SHALL define an issue as dispatchable only when its durable requirements exist, dependencies are satisfied, exactly one repository route is resolvable, and the issue has the exact `agent:ready` label.

#### Scenario: A vague backlog issue is not dispatched

- **WHEN** a Linear issue lacks durable requirements or the `agent:ready` label
- **THEN** the scheduler leaves it undispatched and records the unmet gate

#### Scenario: A cross-repository issue is not dispatched ambiguously

- **WHEN** an issue resolves to more than one repository route
- **THEN** the scheduler leaves it undispatched until the issue is decomposed or assigned one execution route

### Requirement: Relationship-aware Linear intake

The workflow documentation layer SHALL require an interactive intake session to search existing Linear issues for duplicates, overlap, dependencies, and scope conflicts before creating or materially updating an issue, and SHALL record the resulting relationships and priority.

#### Scenario: A related request enters the backlog

- **WHEN** a newly clarified request overlaps an existing Linear issue
- **THEN** the intake process updates or relates the existing issue instead of creating an unlinked duplicate

### Requirement: Selected SDD and change-comprehension lifecycle synchronization

The documentation layer SHALL define Spectra as VolleyBro's selected SDD adapter and Blueprint as its selected change-comprehension adapter, using one stable change slug across Overview, Design, task progress, Review, and archive records without making either adapter a Symphony scheduler invariant.

#### Scenario: Discuss and propose establish understanding

- **WHEN** a change is being discussed or proposed
- **THEN** its Blueprint Overview and Design represent the motivation, scope, behavioral impact, and planned implementation anchored to the stable change slug

#### Scenario: Apply reports canonical task progress

- **WHEN** implementation or requirement ingestion changes task state
- **THEN** Blueprint task progress is derived from the Spectra change artifacts rather than maintained as an independent status field

#### Scenario: Review preserves validation and fixes

- **WHEN** apply completes or pull-request review produces findings
- **THEN** the Blueprint Review records validation evidence, findings, fixes, and relevant commits before archive

### Requirement: Versioned repository delivery profile

The repository documentation layer SHALL expose a machine-readable, versioned `delivery` profile in `WORKFLOW.md` that binds logical capabilities to adapters while the workflow body remains the human-readable policy authority.

#### Scenario: VolleyBro resolves its delivery toolchain

- **WHEN** a developer, provider, or conformance command reads `WORKFLOW.md`
- **THEN** it resolves SDD to Spectra, change comprehension to Blueprint, release planning to Linear milestone, versioning to Changesets, source control to GitHub, and the durable workpad to a Linear comment

#### Scenario: An unsupported capability binding is configured

- **WHEN** the delivery profile names an adapter that the repository contract does not support
- **THEN** `pnpm check:workflow` exits non-zero and identifies the capability and unsupported adapter

### Requirement: Separate release-planning and versioning gates

The workflow documentation layer SHALL require a Linear milestone before `agent:ready` for release-bound issues and SHALL independently require an applicable Changeset or explicit workflow-defined exemption before review handoff.

#### Scenario: Release-bound issue lacks a milestone

- **WHEN** a release-bound issue otherwise satisfies implementation readiness but has no Linear milestone
- **THEN** the issue remains undispatchable and the workpad records the missing release-planning gate

#### Scenario: Implementation lacks required version evidence

- **WHEN** implementation is complete but an applicable Changeset is missing and no exemption applies
- **THEN** the issue does not move to review until the versioning evidence exists

### Requirement: Issue-scoped provider delegation

The workflow documentation layer SHALL allow a provider root to delegate bounded work while retaining scope, integration, and final judgment, and SHALL prohibit provider subagents from claiming other Linear issues, changing queue priority, adding `agent:ready`, or operating outside the current issue workspace.

#### Scenario: A root delegates implementation work

- **WHEN** a provider root assigns a stable, bounded implementation contract to a subagent
- **THEN** the subagent works only within the current issue and workspace and returns evidence to the root for integration

#### Scenario: A subagent attempts queue ownership

- **WHEN** a provider subagent attempts to claim or reprioritize another Linear issue
- **THEN** the workflow treats the action as a policy violation and the root remains the only issue-run integration owner beneath Symphony

### Requirement: Thin provider workflow bridges

The provider-instruction layer SHALL direct Claude Code, Codex, and Antigravity to the repository `WORKFLOW.md` while retaining only provider mechanics and repository hard rules, and SHALL NOT duplicate the shared lifecycle stages.

#### Scenario: Provider instructions locate canonical policy

- **WHEN** any supported provider reads its repository entry instructions
- **THEN** it is directed to load `WORKFLOW.md` before performing delivery work

### Requirement: Durable provider-neutral handoff

The workflow documentation layer SHALL require each dispatched run to maintain a durable workpad containing `issue`, `repository`, `change`, `phase`, `completed`, `validation`, `blockers`, and `next_action`, and SHALL prohibit reliance on provider transcript portability.

#### Scenario: A different provider resumes work

- **WHEN** execution moves from one provider to another
- **THEN** the new provider reconstructs state from Linear, repository artifacts, git, and the workpad without requiring the prior transcript

### Requirement: Workflow conformance command

The repository tooling layer SHALL expose `pnpm check:workflow` and SHALL return a non-zero exit status with actionable diagnostics when the canonical workflow is missing, a provider bridge lacks the canonical pointer, lifecycle content is duplicated in a bridge, or active instructions and automation retain retired spec-loop references.

#### Scenario: A conforming repository passes

- **WHEN** the canonical contract, thin bridges, and active references satisfy all invariants
- **THEN** `pnpm check:workflow` exits successfully

#### Scenario: A bridge duplicates lifecycle policy

- **WHEN** a provider bridge contains shared lifecycle sections instead of only a canonical pointer and provider mechanics
- **THEN** `pnpm check:workflow` exits non-zero and identifies the affected bridge and invariant

### Requirement: Gated spec-loop retirement

The workflow documentation layer SHALL require replacement validation and a zero-reference inventory across active consumers before the external spec-loop repository is archived and its local clone is removed.

#### Scenario: A stale reference blocks retirement

- **WHEN** an active global or repository instruction still references spec-loop
- **THEN** archival and local deletion remain blocked until that consumer is migrated and revalidated

### Requirement: Immediate structured evaluation evidence

The workflow documentation layer SHALL require structured Symphony execution evidence from the first formal run and SHALL prohibit durable evaluation copies of provider prompt, response, reasoning, or transcript text. Provider text SHALL be inspected only ephemerally when required to derive structured metrics and SHALL be discarded after derivation.

#### Scenario: First formal run creates an evaluation envelope

- **WHEN** Symphony is about to dispatch the first formal issue run
- **THEN** a durable run envelope exists before provider execution and records structured lifecycle, routing, role, usage, validation, and artifact-reference evidence

#### Scenario: Provider text informs a metric

- **WHEN** an evaluator must inspect provider text to derive a classification or outcome signal
- **THEN** it processes the text ephemerally and persists only sanitized structured output and source references

#### Scenario: Insufficient samples prevent policy claims

- **WHEN** fewer than ten comparable dispatched issues exist for a cohort
- **THEN** per-run scorecards remain available but trend claims and routing-policy changes remain preliminary and require human approval
