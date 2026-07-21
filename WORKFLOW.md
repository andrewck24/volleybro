---
delivery:
  version: 1
  capabilities:
    sdd:
      adapter: spectra
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
      adapter: spectra
    evaluation:
      adapter: symphony
      text_retention: ephemeral
---

# VolleyBro Software Delivery Workflow

This file is the repository's canonical delivery contract. It is provider-neutral and remains
authoritative when Claude Code, Codex, Antigravity, or a human performs the work. Provider entry
files are bridges only; a higher-priority system or user instruction may override this contract.

## Repository profile

| Responsibility                         | VolleyBro binding                                              |
| -------------------------------------- | -------------------------------------------------------------- |
| Integration branch and default PR base | `dev`                                                          |
| Targeted repository gate               | The narrowest applicable tests, lint, and type checks          |
| Section gate                           | `pnpm verify`                                                  |
| Final gate                             | `pnpm verify:all`                                              |
| Specifications and changes             | `docs/specs/` and `docs/changes/` through Spectra              |
| Change comprehension                   | `blueprint/content/changes/<status>/<slug>/` through Blueprint |
| Release planning                       | Linear milestone on release-bound issues                       |
| Version and changelog evidence         | `.changeset/` through Changesets                               |
| Durable handoff                        | One unresolved `## Symphony Workpad` Linear comment            |
| Evaluation                             | Symphony structured JSONL with `ephemeral_text` processing     |

The front matter binds logical capabilities to their selected adapters. A capability names a
responsibility; an adapter implements it; a plugin may distribute adapters and skills; this profile
selects repository behavior; policy below remains authoritative regardless of provider.

## Authority and durable state

- One Symphony scheduler owns queue polling, claims, concurrency, retries, cancellation, and
  workspace cleanup. Provider-native subagents may help inside one dispatched issue, but never
  claim Linear work.
- Linear owns queue state and issue relations. Exactly one `repo:*` label routes an executable issue
  to a repository; this label is not product taxonomy.
- `agent:ready` means a human has approved unattended implementation. Agents never add it.
- Provider prompts, responses, reasoning, and transcripts are ephemeral and are not shared between
  providers. Resume from Linear, repository artifacts, git, pull requests, and the workpad.
- Decisions, requirements, validation, and review evidence that belong to the engineering record
  must be preserved in the repository rather than only in Linear.

## Linear intake and readiness

Before creating or materially changing an issue:

1. Search open and relevant completed Linear issues, Spectra changes/specs, Blueprint records, and
   repository documentation.
2. Compare the strongest matches, including their parent, milestone, labels, and relations.
3. Classify the request as an update, duplicate, sub-issue, hard dependency, related work, scope
   conflict, or genuinely new work.
4. Record a testable outcome, in-scope and out-of-scope boundaries, acceptance criteria, one
   repository route, priority, and the appropriate relations.
5. Create new work in Backlog without `agent:ready` unless the user explicitly decides otherwise.

Use duplicate relations for the same outcome, parent/sub-issue for decomposition, blocking
relations for required ordering, and related relations only for context. If a comparison is
ambiguous or would materially change another issue, add `needs-user`, state the decision needed,
and stop before mutating the conflicting scope.

An issue is dispatchable only when all of these gates are true:

- durable requirements and acceptance criteria exist;
- hard dependencies are satisfied;
- exactly one repository route resolves;
- release-bound work has a Linear milestone;
- no unresolved `needs-user` decision remains; and
- the exact `agent:ready` label is present.

Missing gates remain visible in Linear or the workpad. The scheduler must not infer readiness from
priority, status, or a detailed description.

## Lifecycle

Each stage uses one stable kebab-case change slug. The human-facing Change Title is separate from
the slug and is used in page titles, navigation, breadcrumbs, and summaries.

### 1. Discuss and propose

- **Owner:** interactive root agent with the developer.
- **Input:** clarified Linear request, related work, repository context, and decisions.
- **Output:** approved Spectra proposal, design, delta specs, tasks, and matching Blueprint Overview
  and Design records.
- **Exit:** artifacts validate, rationale and scope are durable, and the developer approves the
  proposal. Approval does not add `agent:ready` automatically.

Blueprint Overview explains the reason, goals/non-goals, scope, high-level blast radius, task
outline, and affected specs. Blueprint Design explains behavior, architecture, alternatives,
scenarios, detailed source impact, FileTour hotspots, requirement/spec deltas, and risks. Use a
ChangeTree for source-impact overview, FileTour for important files, and a table or interactive flow
when behavioral impact cannot be represented by files.

### 2. Apply and ingest

- **Owner:** the provider root assigned to one issue-run; the root may delegate bounded work.
- **Input:** approved artifacts, ready Linear issue, isolated workspace, and current workpad.
- **Output:** implementation, tests, updated Spectra tasks, derived Blueprint task progress, commits,
  and validation evidence.
- **Exit:** implementation is complete, required checks pass, and requirements have no silent drift.

Before source edits, commit all change artifacts using
`docs(<scope>): add <change-slug> change artifacts`. Commit after each task section, include the
related artifacts, and run `pnpm verify` before each complete section commit. Use Spectra ingest when
requirements change instead of silently diverging. The final implementation commit must pass
`pnpm verify:all`.

### 3. Review and fix

- **Owner:** provider root for evidence integration; human reviewer owns acceptance.
- **Input:** completed implementation, pull request, validation output, and review findings.
- **Output:** one Blueprint Review record containing plan-versus-actual, validation, findings, fixes,
  commits, rollout notes, and residual risks.
- **Exit:** actionable findings are fixed or explicitly resolved, required versioning evidence exists,
  and final validation passes.

Rework updates the same Review artifact. Pull requests target `dev` unless the user specifies
otherwise. The agent does not move an issue to Done; human approval and merge control completion.

### 4. Archive

- **Owner:** interactive root agent or an explicitly approved post-merge automation.
- **Input:** merged change, synchronized integration branch, completed Review record, and Linear
  issue.
- **Output:** archived Spectra change, frozen Blueprint record, durable outcome links, cleaned
  workspace/branch, and completed Linear state.
- **Exit:** repository retention is verified before the issue is marked Done.

Blueprint index, sidebar, status, date, title, breadcrumb, summary, and the three change pages must
derive from one canonical metadata source. Do not maintain parallel status fields.

## Release planning and versioning

Release planning and repository versioning are independent gates:

- **Release-bound:** user-facing behavior, public API or contract, shipped configuration, or a change
  explicitly scheduled for a release. Assign its Linear milestone before `agent:ready`. Add an
  appropriate Changeset before review handoff.
- **Changeset-exempt:** documentation-only changes, tests that do not alter shipped behavior,
  repository-only workflow/CI maintenance, and internal refactors with no externally observable
  package behavior. Record `changeset: exempt — <reason>` in the workpad before review.
- A missing milestone blocks dispatch for release-bound work. A missing Changeset or exemption does
  not block dispatch, but blocks review handoff.
- Milestone assignment never determines semantic version impact; the Changeset does. A Changeset
  never replaces target window, grouping, or delivery order in Linear.

Examples:

| Situation                             | Milestone gate                | Changeset gate         | Result              |
| ------------------------------------- | ----------------------------- | ---------------------- | ------------------- |
| New match-recording behavior          | Required before `agent:ready` | Required before review | Release-bound       |
| Documentation typo                    | Not required                  | Explicit exemption     | May proceed         |
| Release-bound issue without milestone | Missing                       | Not evaluated yet      | Not dispatchable    |
| Completed UI change without Changeset | Passed                        | Missing                | Cannot enter review |

## Issue-scoped delegation

The provider root owns interpretation, decomposition, integration, risk judgment, and final
verification for one dispatched issue. Subagents receive stable, bounded contracts and return
evidence; they must not claim or reprioritize another issue, add `agent:ready`, mutate queue state,
or leave the current issue workspace.

A complete seven-role Codex delegation may use:

1. `scout` to map relevant files and constraints;
2. `plan-verifier` to challenge the proposed plan;
3. `security-reviewer` to identify security boundaries;
4. `mech-executor` for mechanical edits;
5. `executor` for implementation requiring judgment;
6. `verifier` to run independent validation without fixing findings; and
7. `security-executor` for approved high-risk fixes.

The root chooses only roles justified by the issue; the list is not a mandatory pipeline. All role
results return to the same root and issue-run.

## Workpad and provider handoff

Maintain one unresolved `## Symphony Workpad` Linear comment with these fields:

```yaml
issue: ATE-000
repository: volleybro
change: stable-change-slug
phase: discuss | propose | apply | review | archive
completed: []
validation: []
blockers: []
next_action: "smallest concrete continuation step"
```

Also record the environment stamp, current provider, acceptance criteria, durable artifact links,
important decisions, discovered scope, commits, and pull request. On a provider switch, reconstruct
the next action from the issue, workpad, Spectra/Blueprint artifacts, git, and PR—not a prior
transcript. If blocked by credentials, permissions, approval, or product judgment, add `needs-user`,
record the smallest exact unblock action, and stop safely.

## Evaluation evidence

Symphony creates a structured run envelope before every formal provider execution. Durable evidence
may include issue and repository identifiers, run/attempt/provider/role, lifecycle timestamps,
status transitions, token/usage counters when supplied by the provider, changed-file and artifact
references, validation outcomes, retry/error categories, and evidence-completeness state.

`ephemeral_text` means provider prompt, response, reasoning, and transcript text may be inspected in
memory only to derive a sanitized classification or metric and is then discarded. The evaluation
store must never persist those text fields. Per-run scorecards are available immediately; trend
claims or routing-policy changes require at least ten comparable dispatched issues and human
approval.

## Blueprint change contract

Every change uses stable `/changes/<slug>` URLs and exactly three human-facing pages:

- **Overview:** rationale, goals/non-goals, scope, high-level blast radius, task progress, and
  affected-spec summary.
- **Design:** behavior and architecture, decisions and alternatives, source impact, FileTour
  hotspots, requirement/spec deltas, scenarios, and risks.
- **Review:** actual outcome, plan-versus-actual, validation, findings and fixes, commits, rollout,
  and residual risks.

Blueprint task progress derives from Spectra artifacts. Review evidence is appended to the existing
record after each review/fix round. Build checks must eventually reject duplicate slugs, invalid
status, missing pages, unresolved links, incomplete spec coverage, and manual registration drift;
those component and route changes are tracked separately from this workflow contract.
