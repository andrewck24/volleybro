## Why

VolleyBro's delivery lifecycle is currently split across global spec-loop files, provider-specific instructions, external Spectra skills, Linear, and Blueprint conventions. A concise repository-owned contract is needed so Claude Code, Codex, Antigravity, interactive sessions, and the Symphony scheduler follow the same durable process without duplicating governance.

## What Changes

- Add a self-contained repository-root `WORKFLOW.md` that defines Linear intake, the `agent:ready` implementation gate, capability selections, validation, review, handoff, merge, and archive behavior.
- Add a machine-readable `delivery` profile to `WORKFLOW.md` that binds VolleyBro to Spectra for SDD, Blueprint for change comprehension, Linear milestones for release planning, Changesets for versioning, GitHub for source control, and a Linear comment for the durable workpad while keeping those tools replaceable at the Symphony framework boundary.
- Define Blueprint lifecycle timing: Overview and Design during discuss/propose, canonical task progress during apply/ingest, and Review plus fixes after apply and during pull-request review.
- Require every release-bound change to carry a Linear milestone before `agent:ready`, and require an applicable Changeset before handoff to review without treating milestone planning and package versioning as the same concern.
- Define one persistent provider-neutral Symphony workpad and durable cross-provider context boundaries.
- Define issue-scoped delegation invariants so provider-native subagents can assist a root session without claiming other Linear issues or becoming another scheduler.
- Define the repository boundary for Symphony evaluation: execution telemetry may inspect provider text ephemerally, but the repository workflow does not require durable prompt or transcript copies.
- Reduce repository `CLAUDE.md` and `AGENTS.md` workflow content to thin bridges that locate `WORKFLOW.md` while preserving provider mechanics and repository-specific hard rules.
- Add a conformance check that detects a missing workflow contract, duplicated lifecycle text in bridges, and stale references to the retired spec-loop repository.
- Preserve VolleyBro-specific branch, validation, Spectra commit, Blueprint build, pull-request review, and post-merge archive rules in the repository profile.
- Prepare removal of spec-loop references only after the replacement contract and checks pass.

## Non-Goals

- Changing Blueprint information architecture, routes, or shared components; that work remains in the `blueprint-change-information-architecture` change.
- Enabling unattended planning or goal-to-execution automation.
- Implementing the Symphony daemon or provider adapters in the VolleyBro repository.
- Treating Linear Projects or `repo:*` routing labels as product taxonomy.
- Sharing or resuming provider transcripts.
- Implementing Symphony's capability registry, seven Codex role files, event store, evaluator engine, or dashboard in the VolleyBro repository.
- Replacing AI Engineering Coach as the separate tool for developer prompt, session-hygiene, and AI-usage coaching.

## Capabilities

### New Capabilities

- `software-delivery-workflow`: Defines the repository-owned lifecycle contract, configurable delivery profile, provider bridge boundaries, durable workpad, selected SDD/comprehension/release/versioning bindings, evaluation privacy boundary, and conformance requirements.

### Modified Capabilities

(none)

## Impact

- Affected specs: new `software-delivery-workflow` capability.
- Affected code:
  - New: `WORKFLOW.md`
  - New: `scripts/check-workflow-contract.mjs`
  - New: `docs/changes/unified-software-delivery-workflow/specs/software-delivery-workflow/spec.md`
  - Modified: `CLAUDE.md`
  - Modified: `AGENTS.md`
  - Modified: `package.json`
  - Removed: none
