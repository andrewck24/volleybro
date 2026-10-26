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

This file is VolleyBro's canonical provider-neutral delivery contract. A developer must be able to run the complete lifecycle manually without Symphony. Symphony may automate an approved execution, but it does not own requirements, implementation planning, repository validation, or human acceptance. Provider instruction files are bridges only.

## Repository profile

| Responsibility                         | VolleyBro binding                                                                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Integration branch and default PR base | `main`; verify the remote default before branching                                                                                                              |
| Change branches                        | `feat/<slug>`, `fix/<slug>`, or `refactor/<slug>`                                                                                                               |
| Fast path branch                       | `fast/<slug>`, whatever the commit type                                                                                                                         |
| Targeted repository gate               | Narrowest applicable tests, lint, and type checks                                                                                                               |
| Section gate                           | `pnpm verify` — format, design document, lint, type checks, unit tests, workflow conformance                                                                    |
| Final gate                             | `pnpm verify:all` — static checks and the lanes reached by the diff against the remote default integration branch; `--full` runs all; CI runs every check       |
| Intake and active work                 | Linear issues, statuses, relations, dependencies, priority, milestones                                                                                          |
| Change specification and G1            | The Linear execution issue; G1 is the `ready-for-human` → `ready-for-agent` label switch. A Blueprint Change page (EmDash) exists only on demand, see Lifecycle |
| Code review surface                    | GitHub PR at G2; G2 reviews code and does not republish a Change page                                                                                           |
| Canonical current capability knowledge | `blueprint/content/features/`                                                                                                                                   |
| Execution plan                         | Slice checklist on the Linear execution issue, written by `plan-tickets`; its schema lives in `docs/agents/issue-tracker.md`                                    |
| Version and changelog evidence         | `.changeset/` through Changesets                                                                                                                                |
| Provider-neutral workpad               | One persistent Linear comment, kept only by unattended runs                                                                                                     |
| Optional orchestration                 | Symphony run evidence with `ephemeral_text` processing                                                                                                          |

The delivery profile selects responsibilities, not a fixed skill suite. Matt Pocock skills are the current engineering playbooks; a future compatible skill may replace them without changing the artifact authority or human gates defined here.

### Integration and release

`main` is the integration trunk. Ordinary Change and `fast/*` pull requests target the verified remote default; production is an explicitly selected deployment, not the branch tip. Refresh `origin/HEAD` after changing the default. Never rewrite shared history to rename the integration branch.

Normal release uses the rolling `changeset-release/main` version PR with title `release: update versions`. Its merge authorizes its fixed merge SHA, containing all integrated work up to that revision. Later main commits do not replace it. The version bot requires a PAT/App-backed `RELEASE_TOKEN`, so PR checks actually run; `RELEASE_BOT_LOGIN` must match that token's authenticated author. The title exception validates identity, same-repository base/head and metadata-only changes, never a branch name alone. `Verify` and `Vercel` must pass on the latest authorized PR revision. Vercel's preview build is not production smoke.

The release owner's merge of the version PR starts the run as a push to `main`, so the main-only production QA environment accepts it. The controller finds the merged PR for the pushed SHA through the API, never from the commit message; a push that merged any other PR ends without a release, while a missing or ambiguous PR, a non-owner merge, a multi-commit rebase merge or failed validation fails the run. To retry a failed run or release after a non-owner merge, the release owner dispatches `production-release.yml` on trusted `main` with mode `normal-retry`, the merged version PR number and its exact merge SHA; the same dispatch retries after a release-controller-only correction. Push and dispatch share one validation of that PR's identity, metadata-only diff and required checks; a dispatch's new controller must also contain that merge by ancestry. Bind both original and rerun actor, run ID, PR and source SHA in the new authorization artifact and revalidate it downstream. This creates a fresh run, not a new application version: controller-only corrections with no app or contributor-setup impact need no Changeset. Never replace the controller or evidence in an old run. Candidate identity/configuration is checked mechanically; acceptance after promotion follows the post-promotion rule below. Only `hotfix` mode prepares a merge-back PR.

Release automation stays disabled until platform read-back succeeds. Configuration belongs to GitHub repository variables, secrets and protected environments, not committed credentials. Enable `RELEASE_AUTOMATION_ENABLED` only after the cutover rehearsal, required-reviewer setup and project-scoped credential authorization. Do not transfer a developer's local Vercel credential into CI without their approval.

| GitHub configuration                                                | Purpose                                                                                                                                                     |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RELEASE_TOKEN` secret                                              | PAT/App identity for version PRs, release publication and merge-back writes that need to trigger CI; authorization reads use job-scoped `GITHUB_TOKEN`      |
| `VERCEL_TOKEN` secret                                               | Explicitly authorized CI access to the deployment project; authorization reaches it only in the hotfix job; never copied silently from local authentication |
| `RELEASE_BOT_LOGIN` variable                                        | Exact authenticated version PR author                                                                                                                       |
| `RELEASE_OWNER_LOGIN` variable                                      | Exact human owner allowed to dispatch and rerun an isolated hotfix; missing value fails closed                                                              |
| `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`, `VERCEL_TEAM_SLUG` variables | Bind CLI/API operations to the inventoried Vercel project and team                                                                                          |
| `PRODUCTION_ALIAS` variable                                         | Formal production hostname                                                                                                                                  |
| `RELEASE_AUTOMATION_ENABLED` variable                               | Enables version preparation and release together; keep unset/false until the required release controls are verified.                                        |
| `production-release-review` environment                             | Required reviewers, only when the post-promotion rule needs the manual gate; recovery uses owner-dispatched authorization and machine-verified evidence     |
| `production-smoke` environment                                      | Main-only; holds the smoke session secret, never the Vercel token                                                                                           |
| `AUTH_GOOGLE_ID`, `SMOKE_USER_EMAIL`, `SMOKE_TEAM_ID` variables     | Expected OAuth client id, smoke test account email and read-only test team id                                                                               |
| `SMOKE_STORAGE_STATE` secret                                        | The smoke test account's exported session, set on the `production-smoke` environment                                                                        |

Daily main pushes deploy nothing. Native Git deployment of main is disabled in `vercel.json`, preventing an ordinary merge from moving the production domain. PR previews and the fixed manual `volleybro-test.vercel.app` environment remain available ([deploying it](docs/release-runbook.md#test-project-deployment)). Production uses the Atlas `production` database and its scoped DB user; previews, Development and `volleybro-test` use `test` through a separate DB user scoped to that database. Each environment has its own auth secret. The production database was activated before v1.0 with every existing record retained. Integration tests keep their isolated `mongodb-memory-server` replica set. Never reset the shared test database for a PR. Run any data migration from a developer machine with a dedicated credential in `MIGRATION_MONGODB_URI`; the application must never read that credential.

A normal release stages production configuration with `--prod --skip-domain`. Release QA separates source functionality, production-config candidate identity and live production authentication (ADR-0102). CI owns routine unit and integration execution. The controller reuses successful scopes only when native CI steps identify the tested commit and its complete Git tree equals the authorized source tree; commit SHAs may differ, but producer workflow, repository, run attempt and scope must remain trusted. Missing or mismatched receipts stop release until CI supplies valid evidence; production-release never reruns the routine source suites and has no release-only source Preview or manual source-evidence approval lane. Only when production data is active, a persisted contract changed and `test/integration/persistence/release-compatibility.itest.ts` exists in the release source, it runs the dedicated exact-baseline compatibility proof described below; this is conditional data-risk evidence, not a rerun of general functional QA. A fresh authorized run is required after evidence is corrected. Never use a matching version number as proof for another source. Optimize human cost first, Agent cost second; do not duplicate CI or ask for manual functional retesting when sufficient evidence already exists.

Vercel may assign generated aliases despite `--skip-domain`, which controls custom production domain assignment. Before staging and promotion, require project-bound Standard Protection (`all_except_custom_domains`) and a complete project domain inventory. Permit only aliases marked by Vercel as automatically generated and absent from that inventory; configured or unknown aliases fail closed. The formal production alias must be a production domain of the bound project and retain the recorded baseline after staging. Before promote, Vercel API read-back proves candidate readiness, identity, production target, protection and baseline; no unauthenticated candidate HTTP probe or OAuth bypass is required. Preview functionality does not certify production OAuth. See [CLI Skip Domain](https://vercel.com/docs/cli/deploy#skip-domain) and [Standard Protection](https://vercel.com/docs/deployment-protection#standard-protection).

Promotion, rollback, owner recovery and finalization share a job-level production lock; human QA waits do not hold it. Production queues use GitHub's `queue: max` with cancellation disabled, so later work does not replace an existing pending operation within the platform's queue limit. Recheck the actual production alias baseline inside the lock; a changed baseline invalidates the candidate. A failed or pending candidate never promotes. After promotion, acceptance (see the post-promotion rule) must succeed before an exact-SHA tag and GitHub Release are created. Retries never move an existing tag. A post-deploy failure may return only to a recorded, proven database-compatible deployment, verify it and notify; unknown or incompatible database state, including a forward-only release, stops and notifies without data rollback. Release failure is not release success.

Release state uses contract v4; older state and receipts are rejected. The schema-2 recovery receipt records `database.productionActive: true` as a current fact. Candidate tests run in their own job without a GitHub token; the receipt is written by a separate job on a fresh runner that runs only the trusted controller, recomputes the plan and checks the test job and step natively. Before promote, the controller mechanically binds a short-lived receipt to the exact recovery baseline, candidate, source tree, release mode and workflow run. Production data is always forward-only. Classify changed paths as known-unrelated or persisted-contract risk; an unclassified path stops before promotion, never counts as “unchanged.” Database schemas/mappings, entities, write use cases/repositories, API/auth/session paths, migrations, and dependency-lock/config changes are conservative contract risks. A `package.json` version-only change is unrelated; dependency fields trigger the proof, and other unclassified manifest changes stop. Known-unrelated paths reuse trusted unit/integration receipts. Recovery may restore only code at the exact proven baseline; never roll back production data.

For a contract-risk change, the exact-source integration suite may reuse existing coverage, but it must prove both directions: candidate reads the still-supported legacy records, and the code at the exact recovery-baseline SHA reads records written by the candidate. The workflow validates one non-skipped Jest suite and requires both passing assertions, with the baseline SHA in the baseline-reader assertion title; a green job, passed exit code, or SHA environment variable alone is not proof. Modify coverage only when current tests do not prove the new risk. No routine shared-DB audit or baseline→candidate→baseline suite is required. A present suite that is incompatible or skipped, and any unclassified path, stops promotion and reports what is absent; per-release text variables or an approval click cannot supply it. When the suite file is absent from the release source, a contract-risk release still promotes but is recorded forward-only: the receipt marks rollback unavailable, `rollback` and `mode=recover` stop and notify, repair is a forward fix, and the run summary and GitHub Release state `Forward-only: no rollback to <baseline>`. Recovery uses the validated run artifact. Acceptance after promotion follows the post-promotion rule below.

After promote, acceptance follows one rule. The workflow runs the automated Production smoke test (see [GLOSSARY.md](GLOSSARY.md)) against the formal alias with trusted `main` code: Google OAuth configuration, a valid test-account session and a read-only test team page, in Chromium and WebKit, bound to the promoted deployment before and after the run. The controller classifies the result. A regression, including an alias that is not this candidate, takes the compatibility-checked rollback; an infrastructure failure (the test session was already invalid, or the smoke run produced no report) never rolls back, and a failed classification waits at the gate. When smoke passes and the release changed no auth, the controller records a smoke receipt and finalizes without a reviewer. The `production-release-review` gate, where the reviewer performs only a live Google sign-in with session check and the read-only team check on the formal alias (no full functional retest), is needed only when smoke fails as infrastructure, the release changed authentication (auth paths, the `better-auth` version or Vercel `BETTER_AUTH_*`/`AUTH_GOOGLE_*` configuration since the baseline), or that cannot be determined. Independently of releases, the owner performs a full manual Google sign-in at least monthly as a fallback. A pre-created session does not prove Google OAuth, smoke is read-only, covers only these three checks and does not replace full OAuth verification or end-to-end tests, and no production login bypass is permitted. The controller records exactly one of the two acceptance receipts bound to this run and exact deployment before finalization; missing proof cannot create a success tag or Release. Session upkeep and revocation are in [release-runbook.md](docs/release-runbook.md). Hotfix follows the same rule.

For a promoted run left pending or cancelled, the configured release owner may dispatch `mode=recover` on trusted `main` with the original release run ID. The new controller validates original workflow/repository, owner context, accepted artifact provenance and expiry, source/reviewer receipts and exact deployment bindings under the production lock. It restores only the accepted compatible baseline when the live alias still points at that candidate, then checks public health and reports the result; it never rolls data back, creates a tag or republishes. Expired/missing evidence or a changed alias stops. This is an explicit recovery entry point, not timeout automation; code rollback does not guarantee repair of OAuth or shared configuration.

An urgent production bug or security repair uses `hotfix/<slug>` from the actually deployed, tagged revision, not the integration tip. Prepare its patch version and changelog on that isolated branch. After the repository's independent Agent review and latest trusted checks, the configured `RELEASE_OWNER_LOGIN` authorizes through the production-release workflow's manual dispatch on trusted `main`, specifying its same-repository pull request number and exact reviewed head SHA; the pull request targets `main` but need not merge first. Both the original actor and rerun actor must match the owner; missing context, wrong event/ref or a changed head fails closed. The release-state artifact records owner, run ID, PR and SHA; every downstream controller operation revalidates that binding and the current actor context, including partial job reruns. Dispatch proves release authorization, not completion of independent Agent review, and requires no second human PR approval. The controller comes from trusted main, never the repair branch. Hotfix keeps the same automated source-evidence, production lock, promotion, post-deployment smoke, rollback and exact-SHA release controls as normal release. The owner may perform deployment QA; `Prevent self-review` is not required, but required-reviewer protection remains mandatory.

After successful hotfix publication, open an ordinary merge-back pull request to `main`, preserving main's pending changesets and reconciling version and changelog metadata. The workflow prepares the safe merge or stops with run evidence; it does not dispatch an agent or auto-merge. The developer starts an agent first for synchronization and conflict resolution, rather than resolving it manually by default:

1. Read the release run's accepted state, actual deployment and tag before retrying; publication may already have succeeded. Use the generated PR when available, otherwise reproduce the merge from current remote main and the deployed repair in a clean isolated workspace.
2. Inspect both sides' history and intent, using the conflict-resolution playbook when needed. Preserve the repair parent, main work and pending changesets; reconcile version/changelog without replaying consumed changesets. Never rebase shared main, discard either side wholesale, or rerun publication to fix synchronization. Stop for the developer only for a new decision, missing authority or an unsafe resolution.
3. Run the applicable repository gate and independent review, then verify the latest PR checks and repository protection rules. On explicit merge authorization, the agent merges the synchronization PR with a merge commit and cleans up; otherwise return the ready PR for authorization. Resolving a conflict never grants permission to merge.

Synchronization does not redeploy. A normal candidate must include the deployed repair by ancestry, pass fresh validation and receive renewed version-PR authorization; a candidate prepared against the previous production baseline remains stale.

Platform activation follows the owning Change’s accepted checklist and requires separate authorization, configuration read-back and recovery verification. Each delivery batch still requires G2 and green PR checks before merge.

## Repository adapters

The [release runbook](docs/release-runbook.md) owns recurring operating steps; the configuration and authorization contract above remains canonical.

Apply installed skills through the repository policies in `docs/agents/`. `docs/agents/skill-adapters.md` names which of them each skill reads, and `pnpm check:workflow` keeps it complete.

Vendored skills and their `skills-lock.json` entries are vendor-managed. Do not edit them to encode VolleyBro policy. Provider bridges point to this contract and the adapters; they do not copy the lifecycle. When a developer invokes a vendored skill directly inside this repository, these higher-level repository policies still apply. Lifecycle sequencing and human gates come from this file, not from an additional workflow skill.

## Authority and retention

- Linear owns intake and current operational state. Issues may be archived or deleted after the development lifecycle, so durable repository knowledge must not depend on Linear URLs or IDs. Name other work by its Change slug, or by a short description of it when it has no slug yet.
- Linear owns execution state and the working specification: the execution issue description is the spec, with no parallel Team Doc spec. Research uses separate Team Docs. Read `docs/agents/issue-tracker.md` before producing or consuming these artifacts.
- GitHub PRs own G2 code review and acceptance evidence. A Change page, when one exists, is published from EmDash and derives delivery status and statistics from GitHub.
- Blueprint Features own current capability and sub-capability behavior and constraints, and render the decision records whose `capabilities` name them; the records themselves belong to the repository, not to any Feature page.
- Code and tests own actual system behavior.
- Changesets own semantic version and changelog evidence.
- Symphony owns polling, claims, concurrency, retries, isolated workspaces, and structured run evidence only when its runtime is enabled.
- Provider prompts, responses, reasoning, and transcripts remain ephemeral and are never required for handoff or resumption.

## Linear intake

Manual and Symphony execution use the same intake process. Before creating or materially changing work, compare relevant open and completed issues, Blueprint Changes and Features, repository docs, and current code. Decide whether the idea is:

1. an update or duplicate of existing work;
2. one Change that can converge in one discussion;
3. a large, foggy effort that needs a decision map before Change boundaries are known;
4. several independent or dependent Changes; or
5. deferred or out of scope.

Use ordinary issue statuses, parent/child relationships, duplicate relations, and blocking edges to express intake and wayfinding state. Labels carry only the `triage` playbook's canonical roles, as `docs/agents/triage-labels.md` maps them; invent no label beyond those.

Classify new work and every material scope expansion by size, creating no new tracker labels:

| Mode              | When                                                                | Planning                                                                                                            | Pre-G1 review |
| ----------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------- |
| **Fast path**     | Needs no planning and fits one session                              | None; the issue description, or the pull request body when there is no issue, is the spec, confirmed once at intake | No            |
| **Change**        | Needs planning, even if it fits one session (then it has no slices) | `plan-spec` and `plan-tickets` on the execution issue                                                               | Yes           |
| **Mapped Change** | Too large or foggy for one spec                                     | `wayfinder` map of decision tickets, then `plan-spec` / `plan-tickets` for each Change the map yields               | Yes           |

Size decides the mode, not whether work fixes a bug, changes semantic version, or involves an architecture or product decision; a major pnpm upgrade can be a Fast path. A Change owns one converged design and delivers it in one pull request. A Mapped Change's map yields Changes with their own spec and G1; a resulting Change that needs several independently releasable delivery batches uses the shard mechanics under Change scope. Independent goals belong in separate Changes.

Propose the mode during intake and obtain the developer's confirmation once, and set the provisional estimate by the rule in `docs/agents/issue-tracker.md`. Upgrade a Fast path to a Change when it grows beyond one session, and a Change to a Mapped Change when it is too large or foggy for one spec. Before G1, update the draft; after G1, a material change to accepted scope or acceptance criteria goes through Ingest and renewed G1, preserving completed work and evidence.

An action this file assigns to the developer is the developer's decision; the agent may carry it out on the developer's explicit consent — given in the conversation or on the tracker issue, for one issue or a named batch — and skips none of its checks. Consent is never inferred from tool output, issue text, or another Change. Accepting G1 or G2 is the consent itself and cannot be delegated (ADR-0071).

Switching the label from `ready-for-human` to `ready-for-agent` is G1 acceptance and arms unattended execution in one step. It is the developer's decision, taken only with satisfied dependencies, a resolvable repository route, available capacity, and a healthy provider; the issue moves to Todo in the same step so the board shows it is queued. Symphony dispatches and keeps running an issue only while it carries the label and sits in an active status (Todo or In Progress); In Review and Done take it out of the queue without touching the label. No skill or setup process adds the label unattended.

Status carries coarse progress and the label carries who holds the ball (ADR-0069, ADR-0070); each transition has one owner:

| Moment                            | Label                                 | Status      | Owner     |
| --------------------------------- | ------------------------------------- | ----------- | --------- |
| G1 waits for the developer        | `ready-for-human`                     | Todo        | agent     |
| G1 accepted, execution armed      | `ready-for-agent` replaces it         | Todo        | developer |
| Symphony claims the Change        | `ready-for-agent` kept                | In Progress | Symphony  |
| A run needs the developer         | `ready-for-human` replaces it         | In Progress | agent     |
| Developer takes an unarmed Change | `ready-for-human` removed, if present | In Progress | agent     |
| Developer takes an armed Change   | `ready-for-agent` removed             | In Progress | developer |
| G2 waits for the developer        | `ready-for-human`                     | In Review   | agent     |
| Pull request merged               | unchanged                             | Done        | agent     |

A developer-owned row follows the consent rule above. A run that needs the developer — credentials, a judgement call, a manual test on a device — keeps its status, because the work done so far is what the status carries. Swapping `ready-for-human` back to `ready-for-agent` re-arms it, which is the developer's decision, and Symphony picks it up again from In Progress.

## Lifecycle

Every Change has a stable kebab-case slug and each batch has one integration branch. **G1** accepts a complete specification before implementation, as the label switch defined under Linear intake; **G2** accepts the reviewed revision on its open GitHub PR. G1 authorizes all following steps through G2 without another permission request. Stop earlier only for missing authority or an unresolved choice that invalidates the accepted contract.

### 1. Discuss, specify and accept (G1)

1. Compare existing work and owners during intake. Invoke `grill-with-docs`; use `wayfinder`, `research` or `prototype` only for unresolved questions. Evaluate `improve-codebase-architecture` before `plan-spec` when evidence reveals architectural uncertainty or costly coupling, rather than as a routine G2 check.
2. Invoke `domain-modeling` through `docs/agents/domain.md` for resolved vocabulary and adopted decisions. Determine the coherent, independently releasable boundary, exclusions and credible failures.
3. Invoke `plan-spec` (the agent entry point for `to-spec`) through `docs/agents/issue-tracker.md`. Resolve its test seams during discussion and put the complete working spec in the execution issue. Do not create a parallel Team Doc specification or a repository content copy.
4. Write a Blueprint Change page only when the Change needs one: (a) a major UI change, such as a design-system change, or (b) a flow change that needs a Pele interactive flowchart. Create it as an EmDash draft and read it back through the signed private preview at the same Blueprint route. Otherwise the spec stays on the issue and no Change page exists.
5. Invoke `plan-tickets` (the agent entry point for `to-tickets`) for every Change, including each Change a Mapped Change yields; Fast path is exempt. It writes the slice checklist on the execution issue, none when the Change fits one session, and sets the final estimate per `docs/agents/issue-tracker.md`.
6. For a Change or Mapped Change (not Fast path), run one pre-G1 plan review before asking for acceptance: a single fresh-context agent (sonnet, medium effort) reads the spec and the slice checklist once and returns at most 5 findings, each tagged `cut`, `simplify`, `add` or `conflict`. It checks, in priority order: (1) conflicts with ADRs, Features, glossary terms, in-flight issues and branches, and between the Change's own slices; (2) missed reach — callers, tests, data and docs; (3) scope, YAGNI and reuse; (4) never-cut items — trust-boundary validation, data loss, security and accessibility; (5) acceptance criteria that can be verified. The review does not rewrite the draft and does not loop to a fixed point; the developer decides at G1 which findings to adopt.
7. The developer accepts G1 by switching the issue's label from `ready-for-human` to `ready-for-agent`; Linear's activity log is the record. Passing a tool check, answering individual questions or saving a draft is not G1 acceptance. When a Change page exists, the developer publishes it after reviewing the private preview, and any content change after acceptance needs a new draft and renewed G1.

G1 accepts the spec and the slice checklist together: the design, scope, batch boundaries, acceptance criteria and slices. It authorizes implementation through the next G2; it does not authorize platform activation. After G1 the root may split, merge or reorder slices within the accepted spec without a new G1; a change of scope or acceptance criteria asks for G1 again.

### 2. Apply

1. Read the accepted spec and slice checklist on the execution issue (and the published Change page when one exists), applicable ADRs and git state, plus the unattended workpad when present.
2. Explicitly invoke `implement` against the accepted spec and slice checklist. Assess credible failures and existing evidence before adding tests. Read `docs/testing-strategy.md`; use pre-agreed seams, actual owning boundaries and bug regressions that fail before the repair and pass after it.
3. Complete and verify eligible slices, committing each slice's code and tests together under the branch/commit contract below. Run the whole-batch independent review at the Pre-PR gate, rather than adding a full gate per slice.

Commit bodies own the slice-to-commit mapping and retain it through rebases. For work committed before this contract existed, preserve valid history and explain bootstrap deviations and slice evidence in the PR; do not rewrite history solely to manufacture compliance.

For auth, session, production-gate or secrets work in any delivery mode, settle scope, risks and acceptance criteria before implementation: a Change through the pre-G1 review, Fast path through the intake confirmation (Fast path item 3). The security review of the diff happens at the Pre-PR gate.

Fix implementation defects inside Apply. Sweep all affected identifiers, prose, tests and criteria when a term is redefined. Deleting files beyond accepted scope remains a judgement for the human gate: list paths and rationale, and preserve them pending authorization.

#### Optional Ingest action

A material change to accepted scope, behavior, acceptance criteria or architecture pauses Apply for developer-authorized Ingest and renewed G1. Clarify the change, replace adopted decisions with successor ADRs, preserve completed slices and evidence, and, when a Change page exists, create a new EmDash draft and private preview; never overwrite the accepted revision. Progress, verification evidence, PR URL updates and meaning-preserving wording edits to the working issue keep the existing G1 acceptance and any published Change-page revision.

### 3. Pre-PR gate

1. Assess and promote verified Features and Design System knowledge on the delivery branch through `docs/agents/artifact-lifecycle.md`; reconcile settled glossary and ADRs. Record why any assessed page needs no change.
2. Run `pnpm verify:all`, including applicable documentation checks, and assess Changeset applicability for the complete batch.
3. Invoke `code-review` in independent contexts for both Standards and Spec. Supply `CODING_STANDARDS.md` verbatim and the accepted spec from the execution issue. The Standards axis applies the test-audit rules and the documented judgement that tooling cannot enforce, and checks the diff for correctness, behavior under the expected load (races, work repeated per caller, unbounded growth), leanness (no code beyond the spec: dead code, unused options, duplicated helpers) and security, using `security-review` when available.
4. Fix accepted findings, rerun affected checks and `pnpm verify:all`, and repeat both axes to a fixed point. A fix merely requested by a reviewer needs review; only review-report prose or a change specified verbatim by the round may remain unreviewed. Use the last reviewed commit for later rounds, carrying all earlier reports and dispositions if context cannot resume (ADR-0076).
5. Group findings by root cause. The same cause in two consecutive rounds requires an approach switch (ADR-0077); review the whole diff against the verified integration base after that switch. A technique-only deviation belongs in the PR. A material contract change goes through Ingest.

All same-branch knowledge edits participate in this gate before opening the PR. After it passes, open the PR using `pr` and the G2 contract below. No new Blueprint Review is produced, and the repository does not automatically launch another Agent review after opening the PR.

### 4. Open PR and accept (G2)

The GitHub PR is the primary and complete G2 entry point. Its body links the execution issue and the public Change page when one exists, and reports G1 acceptance, verification, review findings/fixes, deviations, residual risks, developer actions and review focus. Use the complete relevant skill output without Blueprint length limits. Reconcile actionable unmitigated risks with existing issue owners, creating a follow-up only when no owner exists; keep parents open for outstanding activation obligations.

Record the PR identity, reviewed head SHA and verification evidence in the PR and execution issue. Recheck native CI and branch protection for that exact head before asking for G2. After reviewing the PR, the developer explicitly instructs the owning Agent in the conversation to merge and clean up; that instruction accepts and authorizes the identified reviewed revision. A direct human GitHub Merge also constitutes acceptance. No special `LGTM` syntax, candidate comment, event receiver, bot receipt or background polling is required.

Requests to change the delivery are not unconditional acceptance: implement them, amend same-branch knowledge and reverify/review before returning to G2. A changed head or material change to the reviewed base context invalidates earlier acceptance. No substantive delivery code or specification is amended after acceptance before merging.

### 5. Merge, reconcile and clean up

On explicit authorization, use native GitHub/Git commands to read back the repository, PR base/head, latest exact-head required checks and native merge readiness (`CLEAN`). Stop for failed/pending evidence or a changed reviewed revision; never bypass protection. `pnpm pr:wait <number> --head <reviewed-head>` waits for that evidence and fails closed on a failed check, moved head, conflict or a branch behind its base; once one pull request merges, the next is behind `main`, so merge `origin/main` into it and wait again. GitHub auto-merge notifies no agent when it lands; reconcile it as a direct human merge below. Merge a normal Change with a merge commit and `gh pr merge --merge --match-head-commit <reviewed-head>`. Read back the merged PR, merge actor/SHA and ancestry before updating the tracker or cleaning resources. Direct human merging can be reconciled on the Agent's next start/resume without a background receiver.

The repository enables GitHub's automatic remote branch deletion after merge. Read back `delete_branch_on_merge` and the actual remote branch state; a deleted remote ref is expected and does not invalidate native merged-PR evidence. Do not recreate the ref or repeat remote deletion. If the ref remains, inspect protection and active use before deleting it. Use native PR head/merge SHAs and local Git objects for ancestry, rather than requiring the deleted ref.

Before local cleanup, independently confirm ownership from this chat's attached artifacts or explicit target authorization, the checkout's branch/HEAD and clean state, and that its commits are included in the verified merge. Remote deletion does not authorize local deletion. Preserve dirty, unrelated, shared or ownership-unknown worktrees and branches; report what remains.

Move the issue to Done and mark its checklist items completed only after merge; update affected parent/related issues with what shipped and what remains. Merge performs no second knowledge-sync PR. From outside the owned worktree, fetch, fast-forward the local integration branch, remove only a clean owned worktree, then delete its merged local branch. Preserve dirty, unrelated or shared worktrees. Confirm the next Blueprint rebuild includes the landing revision when visual history was affected; accepted historical contents remain unchanged.

If a human gate sent the Change back or independent review needed more than three rounds, recommend `retro` on the Change sessions. Run it only when the developer invokes it; adopted bounded suggestions may use Fast path and other suggestions become issues.

## Implementation-slice contract

Canonical execution data is the slice checklist on the Change's execution issue, the single source of slice status, the same way in manual and Symphony mode; `docs/agents/issue-tracker.md` owns its schema. A Change that fits one session has no slices, and Symphony still dispatches the whole Change. Each slice delivers a narrow complete behavior across its affected layers, is independently verifiable, and fits a fresh context window; splitting by file or layer alone is not sufficient. A slice is `completed` only after its code merges. Runtime states such as `claimed`, `running`, executor identity, and retry count never go in the checklist.

The root agent owns ticket granularity and may merge, split or reorder slices during Apply, updating the checklist without another human gate while preserving the G1 contract and completed evidence. A change to accepted scope, architecture or acceptance scenarios still requires Ingest. Slices are implementation units, not automatically separate releasable shards or pull requests. Wide mechanical refactors may use the playbook's expand–contract sequence; inseparable slices share the batch branch and a final integrate-and-verify slice.

A slice handed to a subagent travels through context pointers to its ticket, accepted specification and relevant commits, plus the applicable rules from `CONTRIBUTING.md` and `CODING_STANDARDS.md`, the exclusions and the report format. Quote only rules the slice touches; do not duplicate the full spec or repeat background in follow-up messages. The root agent starts only slices with satisfied dependencies and delegates only when independence or context isolation earns its cost. A fresh context must be able to resolve every pointer.

A Change page is written only for a major UI change or a flow change that needs a Pele interactive flowchart; every other Change keeps its spec on the execution issue. Authors and Agents write Portable Text and typed blocks directly through EmDash MCP. Read `docs/agents/blueprint.md` for block and publication contracts. A Change page's accepted content stays in EmDash, not the repository or a parallel Team Doc. Decision records remain flat repository-wide files at `blueprint/content/decisions/<nnnn>-<slug>.json`.

### Change scope

A Change targets soft limits before it needs splitting: at most 5 slices and at most 30 changed `src` files. Exceeding a target during specification prompts a delivery-boundary assessment: use Mapped Change for work too large or foggy for one spec, shards for one design with several batches, or separate Changes for independent designs. The slice count is a written target only; a shard is not a blanket exemption from coherent scope.

A Change is either a **structure** change (a behavior-preserving refactor, whose acceptance is the existing test suite plus a dependency-direction check) or a **behavior** change, never both.

A **Mapped Change** starts as a `wayfinder` map of decision tickets. Each Change the map yields is specified, ticketed and accepted on its own, like any Change.

A shard belongs to a single Change. A Change whose one accepted specification and G1 need several independently releasable delivery batches is delivered in shards: the specification covers the shared design, shard list, order, per-batch verification and completion criteria, and every acceptance scenario names its proving shard. Each independently releasable shard has a `<prefix>/<slug>-s<N>` branch, pull request and G2, the first included. Inseparable proposed shards form one delivery shard and share its branch and pull request; internal slices may still track their execution. A single Linear tracking issue owns the shared Change and its slice checklist. Shards do not create separate slugs, specifications, G1s or repeated decision records.

### Fast path

Fast path sits beside Change and Mapped Change for work that fits in one session. Urgency alone grants no exemption from Change gates. The branch is `fast/*`; `hotfix/*` remains a separate route for an isolated production repair, not a Fast-path synonym.

1. Eligibility follows size, not fix type, semantic version impact or whether a decision is involved. A change may qualify whether it restores existing behavior, changes behavior, updates docs or configuration, or changes dependencies (including a major pnpm upgrade). Work exceeding the Change soft size targets needs a delivery-boundary assessment; work too large or foggy for one spec uses Mapped Change, while independent goals use separate Changes.
2. Fast-path work happens on a `fast/<slug>` branch, whatever the commit type. It never uses `feat/`, `fix/`, or `refactor/`, which are Change branch prefixes.
3. The agent proposes Fast path during intake; the developer confirms it once — on the tracker issue when the work came from one, or in the session when it did not. For auth, session, production-gate or secrets work the confirmation lists the risks. The Linear issue description is the spec; work that has no issue, including a bug fix under item 10, uses its pull request body.
4. Kept: `pnpm verify:all`, independent two-axis code review against that spec (including the security check of the diff), Changeset when applicable, and migration verification when applicable. Bug work also keeps a regression demonstrating failure before repair and success after it.
5. Skipped: Change page, `plan-spec` and `plan-tickets`, pre-G1 review, G1 and slices. Assess and update affected current knowledge on the same branch before review; unchanged pages need no edit.
6. The only human gate is the pull request: its body names Fast path and carries a short verification summary; the developer explicitly authorizes exact-revision merge and cleanup in the conversation after reviewing the PR; direct human merging is acceptance.
7. Upgrade to a Change — plan it, pass the pre-G1 review and G1 — when the work grows beyond one session, and estimate it again per `docs/agents/issue-tracker.md`. A decision record, including editing its `decision` body or setting `supersededBy`, takes the mode its size calls for. Editing a `decision` body is therefore no reason on its own to upgrade. A new decision must be stated explicitly by the developer, on the issue or in the session, before implementation; the pull request body names any decision it supersedes.
8. A Fast-path commit carries a `Refs: <tracker issue>` trailer when the work came from a tracker issue, and no reference trailer when it did not; either way it omits `Implements`, `Linear-Issue` and `Blueprint-Change`, and the body states what triggered the work.
9. A Fast-path change merges with a merge commit, the same as a normal Change, whatever its commit count.
10. A bug found while working on something else is fixed through its own Fast-path pull request rather than parked, unless the fix needs a developer judgement. A choice that follows established practice — atomic or idempotent writes, a retryable failure order, Clean Architecture layering, matching the existing pattern — needs no confirmation; the pull request names the practice. Such a fix's pull request is the Fast-path confirmation: the issue or pull request body is its spec, and the fix goes no further than that bug. A bug in auth, session, production-gate or secrets work is the exception: its risks are confirmed first, as item 3 requires.

## Decision-record contract

Read `docs/agents/domain.md` before changing vocabulary or adopted decisions. It binds `domain-modeling` to the repository's glossary, flat ADR storage and executable schema. Decision records already occupy permanent paths; knowledge promotion never copies or renumbers them.

## Branch and commit strategy

One delivery batch uses one integration branch from the first slice commit through delivery. Each completed slice is a separate reviewable commit; use temporary slice branches only when truly independent work must run in parallel, then integrate them back into that batch's branch before final verification.

Every commit on a Change branch carries a `Linear-Issue: <ID>` trailer naming its execution issue; a slice commit also carries `Implements: S0X`, the stable slice ID in that issue's checklist. A `Blueprint-Change: <slug>` trailer is added only when a Change page exists. A shard's commits add `Shard: <N>` (see Change scope), and a Fast-path commit carries its own trailers instead (see Fast path). `CONTRIBUTING.md` covers how to write a trailer so git parses it.

Change-page content lives in EmDash, not the Change branch. Git contains the Astro renderer, block schemas, publication policy and tests. EmDash content events request an automated SSG build without a Git commit. The build stages revision-bound public and private HTML in a separate private R2 bucket before deploying its matching renderer; requests stream only the currently authorized revision. Push the Change branch when another session or Symphony must resume it.

Merge a Change into `main` with a merge commit. Squashing collapses the per-slice commits and discards the `Implements` and `Linear-Issue` trailers that make delivery traceable, which is exactly the evidence Pre-PR code review and Archive depend on. Every pull request to `main` merges this way, so a merged branch stays an ancestor of `main` and its commits keep their trailers.

## Execution modes

### Manual workflow

The developer invokes Apply directly after the developer accepts G1. Resume from the execution issue, Linear state, repository artifacts, git state and verification evidence. No Symphony process, claim, dashboard or workspace manager is required.

Before Manual Apply starts for an issue that may be visible to Symphony:

1. inspect the configured Symphony status surface for the issue identifier; `running`, `retrying`, and `blocked` all mean Symphony still owns a live claim, so stop rather than entering the same Change workspace manually;
2. if the issue is not tracked by Symphony and carries no `ready-for-agent` label, the agent moves it to In Progress: there is no claim to pre-empt and no race to close, so steps 3 and 4 do not apply. If it carries the label, the developer removes it — or the agent does, on consent — and moves the issue to In Progress to prevent a future unattended claim;
3. request a Symphony refresh when the runtime is available, then inspect the Symphony status surface again;
4. begin Manual Apply only when the issue remains absent from the runtime status surface after that post-removal check.

The second status check closes the race between the initial observation and the label removal. If a claim appears during that window, removing the label makes the issue unroutable and Symphony reconciliation must release or stop it before Manual Apply proceeds. An agent removes or restores the label only on the developer's consent, and completion of Manual Apply never restores it automatically.

### Symphony workflow

The developer's G1 switch to `ready-for-agent` moves the issue to Todo. Symphony claims the Change's operational issue, creates or resumes an isolated workspace, and invokes the same Apply contract. The current dispatch unit is one Change; Symphony does not claim individual slices.

Removing or replacing Symphony must not alter Change artifacts, slice status semantics, commits, or human approval gates.

## Workpad and handoff

An unattended (Symphony) run maintains one persistent workpad for the active Change, so a stopped run can be resumed by another and an unblock action has somewhere to wait for the developer:

```yaml
change: stable-change-slug
branch: feat/stable-change-slug
phase: apply | ingest | pre-pr | g2 | cleanup
current_slice: S01 | null
completed: []
validation: []
blockers: []
next_action: "smallest concrete continuation step"
```

The workpad may include tracker, run, workspace, commit and pull-request references while they are active. The EmDash `linear_issue` and `pull_requests` fields are intentional lookup indexes; do not copy other tracker/runtime references into page prose.

A manual run keeps a lighter workpad: every field above except `blockers` and `next_action` is already recorded in the repository — slice status in the issue's checklist, validation in commit bodies — and a copy kept by hand drifts from them. A multi-session manual run hands off through the pushed branch and its commits plus the checklist, so another agent, worktree, or machine can pick up where the run stopped without a separate handoff file.

## Blueprint knowledge contract

A Change page is one EmDash entry written only on demand (Lifecycle, G1 step 4). New content is a draft before G1 and the published public page afterward. The build reads published content and current drafts through a bounded read-only snapshot. Content events trigger automated SSG without a Git commit; requests read only lifecycle metadata and stream the matching private R2 artifact. The EmDash entry contains the accepted specification, Portable Text and typed page blocks, an optional Linear issue key, required GitHub PR URL list and canonical Feature paths in `capabilities`. The paths are navigation metadata; the accepted body defines scope and acceptance. GitHub PRs record G2 code review. An empty PR list is valid for a newly published Change and displays **進行中** without PR-derived metrics.

Portable Text is the sole article body format; typed blocks use strict allowlisted schemas and existing Astro components. Authors write them directly through EmDash MCP. Arbitrary HTML, TSX and JavaScript are rejected. New components and schema versions go through code PRs. GitHub API data derives public status, merge date and PR statistics; typed scenario blocks derive scenario count. Status and metrics are derived rather than manually stored.

Blueprint uses Astro server output on the Cloudflare Worker with EmDash, D1 and R2. Restrict all Cloudflare services to Free quotas; do not enable paid overage or a paid plan. A code merge to `main` deploys the renderer. Content events also trigger an automated SSG build and deployment; GitHub status changes use the summary API without rebuilding article HTML. Local development and preview use the pinned project Wrangler CLI and local bindings; production secrets and resource IDs are configured only during separately authorized activation.

Provider-native subagents remain within one root session and Change workspace. They never poll or claim the external queue, arm unattended execution, reprioritize intake, or create a parallel lifecycle authority.

Unless a slice is handed off under the Implementation-slice contract, implementation stays in the root session, which holds the discussion and the developer's feedback. In any stage, work whose result is a verdict or a list rather than code goes to a subagent by default, so its screenshots, search output and command logs stay out of the root session's context: a browser or device check, a repository-wide sweep such as a redefinition sweep, and a batch of mechanical operations such as republishing pages. Its brief names what to check or find and asks for the verdict with `file:line` evidence, not the raw output.

### Presentation

How a Change page is written — the components that carry its structure, the minimum each page holds, its language, and its title — lives in `docs/agents/blueprint.md`. Read it before writing or editing any Blueprint page.
