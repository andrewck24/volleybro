## Context

VolleyBro currently distributes delivery policy across provider-specific instruction files, global spec-loop assets, external Spectra skills, Linear issues, and Blueprint pages. This makes the lifecycle difficult to inspect as one contract and allows provider instructions, change task status, and Blueprint presentation status to drift.

The replacement must remain usable by interactive Claude Code, Codex, and Antigravity sessions as well as by a single Symphony scheduler. Provider transcripts are not portable, so shared progress must be reconstructed from repository artifacts, Linear, git state, and a durable workpad. The repository already has strict validation, commit, pull-request, Spectra, and Blueprint rules that must remain authoritative.

## Goals / Non-Goals

**Goals:**

- Establish one self-contained, repository-owned `WORKFLOW.md` as the canonical delivery contract.
- Express replaceable delivery tooling through a typed, machine-readable profile without making the repository depend on workstation-global defaults.
- Keep provider-native instruction files as thin bridges without duplicating lifecycle policy.
- Define explicit handoffs between Linear intake, Spectra artifacts, Blueprint pages, implementation, review, and archive.
- Coordinate release intent through Linear milestones while retaining Changesets as the independent version and changelog mechanism.
- Make task and page status derive from canonical artifacts so navigation surfaces cannot drift independently.
- Provide an automated conformance check for the durable structural invariants.
- Preserve Symphony execution evidence without requiring a second persistent copy of provider prompts or transcripts.

**Non-Goals:**

- Redesigning Blueprint routes, information architecture, or shared components.
- Adding the Symphony runtime or provider adapters to VolleyBro.
- Enabling autonomous planning before a human marks an issue `agent:ready`.
- Treating Linear Projects or routing labels as product taxonomy.
- Sharing provider transcripts or credentials.
- Implementing the Symphony capability registry, provider role definitions, eval event store, or eval dashboard in this repository.
- Evaluating a developer's prompt-writing habits, work hours, or session hygiene; AI Engineering Coach remains the dedicated tool for that purpose.

## Decisions

### Make WORKFLOW.md the canonical repository contract

`WORKFLOW.md` will contain the complete delivery lifecycle and all VolleyBro-specific gates. It will be self-contained rather than importing a global file or depending on a symlink, so a fresh clone remains understandable and executable.

The alternative was to keep the lifecycle in global provider instructions. That would make behavior depend on one workstation and require parallel maintenance for every provider.

### Keep provider instruction files as thin workflow bridges

Repository `CLAUDE.md` and `AGENTS.md` will identify `WORKFLOW.md` as canonical, instruct the provider to read it before delivery work, and retain only provider mechanics or hard rules that the provider must discover before loading the workflow. They will not restate the lifecycle.

The alternative was to generate full provider-specific copies. Copies make divergence difficult to detect and obscure which document is authoritative.

### Use Linear for queue state and repository labels for execution routing

Linear issues express demand, relationships, priority, readiness, and high-level state. An issue is eligible for unattended implementation only after requirements are durable, dependencies are satisfied, a single repository route is resolvable, and `agent:ready` is present. `repo:*` labels route work to a checkout; they do not classify products.

The alternative was to assume a one-to-one mapping between a Linear Project and a repository. Cross-repository projects make that assumption invalid.

### Bind VolleyBro SDD to Spectra and change comprehension to Blueprint

Within the VolleyBro delivery profile, Spectra is the selected SDD adapter and Blueprint is the selected change-comprehension adapter. During discuss and propose, a stable change slug anchors Overview and Design. During apply and ingest, task progress is derived from Spectra artifacts rather than edited separately in Blueprint navigation metadata. After apply and during pull-request review, Review records validation, findings, fixes, and commits. Archive occurs only after repository and Linear records contain the durable outcome.

The alternative was to maintain a separate Blueprint status model. Independent status fields caused index, sidebar, and page coverage drift.

### Represent delivery tools as capability bindings in the repository profile

The `WORKFLOW.md` front matter will contain a versioned `delivery` profile. The profile names logical capabilities separately from their selected adapters: VolleyBro binds SDD to Spectra, change comprehension to Blueprint, release planning to Linear milestone, versioning to Changesets, source control to GitHub, and the durable workpad to a Linear comment. The workflow body remains the human-readable invariant policy and tool-specific mechanics remain in the selected skills or adapters.

The profile uses the following stable meanings: a capability is a logical responsibility, an adapter implements one capability with a tool, a plugin is an installable distribution unit that can provide adapters and skills, a profile records one repository's selections, and a policy is a rule that remains authoritative regardless of selected adapters. Framework-wide canonical definitions belong in Symphony's `docs/LANGUAGE.md`; VolleyBro remains self-contained by describing its resolved selections and required behavior in `WORKFLOW.md`.

The alternative was to hard-code Spectra, Blueprint, Linear, and Changesets as Symphony scheduler concepts. That would couple queue execution to one repository toolchain and make replacement require runtime changes.

### Keep release planning and repository versioning independent

Linear milestones will group change issues by intended version, delivery window, and sequence. An issue that contributes to a release must have a milestone before a human adds `agent:ready`. Changesets will continue to describe package-version impact and changelog content in the repository; an applicable implementation cannot move to review without its Changeset unless the workflow identifies the change as exempt.

The alternative was to use either a milestone or a Changeset as the only release record. A milestone cannot produce a repository version or changelog, while a Changeset cannot express cross-issue delivery ordering and target dates.

### Bound provider-native delegation to one dispatched issue

A provider root may delegate bounded discovery, plan challenge, implementation, security review, or verification to provider-native subagents. The root retains scope, integration, and final judgment. Subagents must remain within the current issue and workspace, must not claim or reprioritize Linear work, and must not add `agent:ready`. Provider role names and model bindings are global provider mechanics rather than duplicated repository lifecycle policy.

The alternative was to let subagents independently discover queue work. That creates multiple claim owners and conflicts with the accepted single-scheduler architecture.

### Persist structured Symphony evidence with ephemeral provider text

The repository workflow will require durable structured execution evidence and artifact references but will not require full prompts, responses, reasoning, or transcripts to be copied into an eval store. A Symphony evaluator may inspect provider text transiently to derive metrics, sanitized classifications, or outcome evidence, then discard the text. Developer-focused prompt and session coaching remains outside Symphony eval and can be performed separately with AI Engineering Coach.

The alternative was to persist a normalized transcript cache. That duplicates sensitive provider logs, expands the security and retention surface, and does not materially improve issue-level delivery evaluation.

### Capture evaluation evidence from the first formal run

Instrumentation and per-run evaluation will be active before the first formal Symphony dispatch. The previous ten-run threshold no longer delays capture or scorecard generation; it only prevents low-sample trend claims or routing-policy changes. Routing changes remain human-approved even after the threshold.

The alternative was to add evaluation after enough production runs existed. That would permanently lose the baseline needed to evaluate the initial routing and role configuration.

### Use a durable workpad for cross-provider handoff

Each dispatched run maintains a provider-neutral workpad containing the issue identifier, repository, change slug, current phase, completed work, validation evidence, blockers, and next action. A new provider reconstructs state from this workpad plus Linear, repository artifacts, and git; it never depends on another provider's transcript.

The alternative was transcript continuation. Claude Code, Codex, and Antigravity do not share a portable session format.

### Enforce structural invariants with a repository check

A deterministic script will verify that the canonical workflow exists, provider bridges point to it without duplicating lifecycle sections, and retired spec-loop references are absent from active repository instructions and automation. The check will be exposed through the package scripts and included in repository verification.

The alternative was review-only enforcement. The known drift modes are mechanical and benefit from an executable guard.

### Retire spec-loop only after replacement validation

Migration will first materialize and validate the new contract, then remove active references, and only then allow the external spec-loop repository to be archived and its local clone removed. Rollback before retirement restores the prior instruction files; after retirement, the archived repository remains recoverable from GitHub.

The alternative was immediate deletion, which could leave unresolved references or missing lifecycle rules.

## Implementation Contract

**Behavior:** A developer or agent starting delivery work in VolleyBro can read one repository document and determine intake, proposal, readiness, implementation, review, handoff, merge, and archive gates. Provider entry files direct the agent to that contract. Blueprint status and task presentation are derived from Spectra artifacts and review records rather than maintained as independent truth.

**Interfaces and data shape:**

- `WORKFLOW.md` is the canonical human- and agent-readable contract.
- `WORKFLOW.md` front matter exposes a versioned `delivery` profile with `sdd`, `change_comprehension`, `release_planning`, `versioning`, `workpad`, `scm`, `review`, `validation`, `archive`, and `evaluation` selections.
- `CLAUDE.md` and `AGENTS.md` contain concise bridge sections that name `WORKFLOW.md` and do not reproduce lifecycle stages.
- `pnpm check:workflow` invokes a deterministic repository-local conformance script.
- A handoff workpad records at least `issue`, `repository`, `change`, `phase`, `completed`, `validation`, `blockers`, and `next_action` in a readable durable format defined by `WORKFLOW.md`.
- Linear readiness uses the exact label `agent:ready`; provider and repository labels affect routing only.
- A release-bound issue has a Linear milestone before `agent:ready`; the repository separately carries an applicable Changeset or an explicit workflow-defined exemption before review.
- Provider-native subagents remain scoped to the current issue and workspace and cannot mutate queue ownership or readiness.
- Evaluation records may contain structured events, usage, role, timing, validation outcomes, and artifact references, but do not contain durable copies of prompt, response, reasoning, or transcript text.

**Failure modes:** The conformance command exits non-zero with an actionable message when the canonical file is missing, the `delivery` profile is incomplete or unsupported, a bridge omits the canonical pointer, duplicated lifecycle markers are detected, or active retired spec-loop references remain. Ambiguous repository routing, unmet dependencies, missing durable requirements, missing required milestone, or absent `agent:ready` leave an issue undispatched and surface the reason in the workpad or Linear. A missing required Changeset blocks review handoff rather than dispatch. Evaluation storage failure is owned by Symphony runtime and cannot be silently represented as complete repository evidence.

**Acceptance criteria:** `spectra validate unified-software-delivery-workflow --strict`, `pnpm check:workflow`, repository formatting and tests, and final `pnpm verify:all` pass. Manual inspection confirms the discuss/propose, apply/ingest, review/fix, and archive phases have one authoritative source, provider bridges remain thin, the selected capability bindings are explicit, release planning and versioning use separate gates, and no repository contract requires durable transcript copies.

**Scope boundaries:** This change covers repository policy, bridge content, and conformance tooling. It does not change application runtime behavior, Blueprint page layouts, Symphony runtime implementation, Linear taxonomy, or provider credentials.

## Risks / Trade-offs

- [A self-contained repository contract can drift from the global template] → Keep the repository profile explicit and add a later cross-repository conformance rollout tracked in Linear.
- [A thin bridge can omit a provider-specific safety rule] → Preserve hard provider mechanics in the bridge and move only shared lifecycle content.
- [Static checks can over-match historical documentation] → Limit retired-reference checks to active instructions and automation, and emit the matched path and rule.
- [Derived Blueprint status requires existing pages to follow the stable slug convention] → Document the invariant now; route and component migration remains in the separate Blueprint change.
- [Retiring spec-loop too early can break another repository] → Require a global reference inventory and successful repository validation before archival.
- [A flexible profile can become a second workflow language] → Keep the schema limited to capability selections and deterministic gates; lifecycle rationale remains in the `WORKFLOW.md` body.
- [Milestones are changed while another planning session is active] → Record the adapter and gate now, but defer milestone creation, issue ordering, and dependency mutations until the final pre-run Linear refresh with the user.
- [Ephemeral text limits retrospective prompt analysis] → Keep provider source logs as their existing source of record and use AI Engineering Coach separately when developer coaching is desired.

## Migration Plan

1. Add and validate the repository `WORKFLOW.md` delivery profile and resolved capability bindings.
2. Add the conformance command and tests for passing and failing fixtures.
3. Reduce repository provider instructions to thin bridges while preserving hard rules.
4. Run Spectra validation, `pnpm check:workflow`, and `pnpm verify:all`.
5. Inventory active global and repository references to spec-loop, migrate each consumer, and repeat conformance checks.
6. Complete Symphony runtime, seven-role, and evaluation preflight without starting a formal run.
7. Refresh Linear after concurrent roadmap planning finishes, then agree milestones, issue order, and dependencies with the user.
8. Validate the Symphony runtime in the foreground with a real Linear issue only after that agreement.
9. Archive the GitHub spec-loop repository and remove the local clone only after the reference inventory reaches zero.

Rollback before step 7 restores the backed-up provider instruction files and package scripts. After step 7, the GitHub repository can be unarchived if recovery is required.

## Open Questions

None for this change. Blueprint component and information-architecture decisions remain in `blueprint-change-information-architecture`.
