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

| Responsibility                         | VolleyBro binding                                                                                                                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Integration branch and default PR base | `main` after cutover; during transition use the verified remote default branch                                                                                                                                  |
| Change branches                        | `feat/<slug>`, `fix/<slug>`, or `refactor/<slug>`                                                                                                                                                               |
| Fast path branch                       | `fast/<slug>`, whatever the commit type                                                                                                                                                                         |
| Targeted repository gate               | Narrowest applicable tests, lint, and type checks                                                                                                                                                               |
| Section gate                           | `pnpm verify` — format, lint, type checks, unit tests, workflow conformance                                                                                                                                     |
| Final gate                             | `pnpm verify:all` — static checks and the lanes reached by the diff against the remote default integration branch; `--full` runs all; CI runs every check                                                       |
| Intake and active work                 | Linear issues, statuses, relations, dependencies, priority, milestones                                                                                                                                          |
| Change review surface                  | `blueprint/content/changes/<slug>/`, one page with a Proposal tab and a Review tab per shard, one file per tab; gitignored on the Change branch, published to the `blueprint-changes` store branch at each gate |
| Canonical current capability knowledge | `blueprint/content/features/`                                                                                                                                                                                   |
| Execution plan                         | `to-tickets` after G1; Linear slice sub-issues under the Change's issue                                                                                                                                         |
| Version and changelog evidence         | `.changeset/` through Changesets                                                                                                                                                                                |
| Provider-neutral workpad               | One persistent Linear comment, kept only by unattended runs                                                                                                                                                     |
| Optional orchestration                 | Symphony run evidence with `ephemeral_text` processing                                                                                                                                                          |

The delivery profile selects responsibilities, not a fixed skill suite. Matt Pocock skills are the current engineering playbooks; a future compatible skill may replace them without changing the artifact authority or human gates defined here.

### Integration and release cutover

`main` is the target integration trunk, not a production branch. Ordinary Change and `fast/*` pull requests target it; production is an explicitly selected deployment, not the current branch tip. During the transition, the remote default remains the actual integration base until the developer accepts the cutover at G2. Refresh `origin/HEAD` with `git remote set-head origin --auto` after changing the default. Never rewrite shared history just to rename the integration branch.

Normal release uses the rolling `changeset-release/main` version PR with title `release: update versions`. Its merge authorizes its fixed merge SHA, containing all integrated work up to that revision. Later main commits do not replace it. The version bot requires a PAT/App-backed `RELEASE_TOKEN`, so PR checks actually run; `RELEASE_BOT_LOGIN` must match that token's authenticated author. The title exception validates identity, same-repository base/head and metadata-only changes, never a branch name alone. `Verify` and `Vercel` must pass on the latest authorized PR revision. Vercel's preview build is not production smoke.

After a release-controller-only correction, the release owner may dispatch `production-release.yml` on trusted `main` with mode `normal-retry`, the already merged version PR number and its exact merge SHA. Revalidate that PR's identity, metadata-only diff and required checks; the new controller must contain that merge by ancestry. Bind both original and rerun actor, run ID, PR and source SHA in the new authorization artifact and revalidate it downstream. This creates a fresh run, not a new application version: controller-only corrections with no app or contributor-setup impact need no Changeset. Never replace the controller or evidence in an old run. Candidate and live authenticated QA remain mandatory; only `hotfix` mode prepares a merge-back PR.

Release automation stays disabled until platform read-back succeeds. Configuration belongs to GitHub repository variables, secrets and protected environments, not committed credentials. Enable `RELEASE_AUTOMATION_ENABLED` only after the cutover rehearsal, required-reviewer setup and project-scoped credential authorization. Do not transfer a developer's local Vercel credential into CI without their approval.

| GitHub configuration                                                             | Purpose                                                                                                                                                |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RELEASE_TOKEN` secret                                                           | PAT/App identity for version PRs, release publication and merge-back writes that need to trigger CI; authorization reads use job-scoped `GITHUB_TOKEN` |
| `VERCEL_TOKEN` secret                                                            | Explicitly authorized CI access to the deployment project; never copied silently from local authentication                                             |
| `RELEASE_BOT_LOGIN` variable                                                     | Exact authenticated version PR author                                                                                                                  |
| `RELEASE_OWNER_LOGIN` variable                                                   | Exact human owner allowed to dispatch and rerun an isolated hotfix; missing value fails closed                                                         |
| `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`, `VERCEL_TEAM_SLUG` variables              | Bind CLI/API operations to the inventoried Vercel project and team                                                                                     |
| `PRODUCTION_ALIAS`, `INTEGRATION_ALIAS` variables                                | Formal production hostname and the separate fixed test hostname                                                                                        |
| `RELEASE_AUTOMATION_ENABLED` variable                                            | Keep unset/false until platform cutover is verified; enables version preparation, integration deployment and release together                          |
| `production-release-review` environment                                          | Required reviewers for exact candidate QA and post-deployment authenticated smoke                                                                      |
| `integration` environment                                                        | Main-only Preview deployment; use test DB and approved OAuth configuration                                                                             |
| Optional `RELEASE_ROLLBACK_COMPATIBILITY`, `RELEASE_ROLLBACK_EVIDENCE` variables | Exact `baselineId:candidateId:releaseSHA` and HTTPS source evidence shown before protected QA; only the accepted artifact confers rollback authority   |

Daily main pushes use the Preview target and a fixed integration alias. Native Git deployment of main is disabled in `vercel.json`, preventing an ordinary merge from moving the production domain. PR previews and the fixed manual `volleybro-test.vercel.app` environment remain available. Integration and previews use the Atlas `test` database; integration tests keep their isolated `mongodb-memory-server` replica set. Releases also use `test` until the first stable release: switching to a clean `production` database and retaining only explicitly selected data is a separate, authorized operation. Never reset the shared test database for a PR.

A normal release stages production configuration with `--prod --skip-domain`. Its recorded candidate deployment ID and release SHA are checked before promotion. The required authenticated checks are homepage, login/session and a read-only team page; HTTP success alone does not prove login. Until safe automated sessions exist, protected-environment QA approval records these checks against the exact candidate. It is QA, not a second version-selection authorization. No production login bypass is permitted.

Vercel may assign generated aliases despite `--skip-domain`, which controls custom production domain assignment. Before staging and promotion, require project-bound Standard Protection (`all_except_custom_domains`) and a complete project domain inventory. Permit only aliases marked by Vercel as automatically generated and absent from that inventory; configured or unknown aliases fail closed. The formal production alias must be a production domain of the bound project and retain the recorded baseline after staging. QA uses the immutable deployment URL, not a mutable generated alias. See [CLI Skip Domain](https://vercel.com/docs/cli/deploy#skip-domain) and [Standard Protection](https://vercel.com/docs/deployment-protection#standard-protection).

Promotion and rollback share the production lock. Recheck the actual production alias baseline inside the lock; a changed baseline invalidates the candidate. A failed or pending candidate never promotes. After promotion, smoke must pass before an exact-SHA tag and GitHub Release are created. Retries never move an existing tag. A post-deploy failure may return only to a recorded, proven database-compatible deployment, verify it and notify; unknown or incompatible database state stops and notifies without data rollback. Release failure is not release success.

Rollback compatibility is an engineering judgement, not a consequence of a passing HTTP test. Before protected candidate QA approval, the release owner examines schema/migration and existing-data effects, records the evidence location, and explicitly asserts compatibility for that exact baseline, candidate and SHA. The protected approval job captures that assertion and evidence in its release artifact. Recovery reads only the accepted artifact, never a mutable variable changed after approval. Without that bound evidence, stop and notify even if redeploying the old code looks easy. Environment approval means the reviewer checked this evidence as well as the candidate's required smoke paths.

An urgent production bug or security repair uses `hotfix/<slug>` from the actually deployed, tagged revision, not the integration tip. Prepare its patch version and changelog on that isolated branch. After the repository's independent Agent review and latest trusted checks, the configured `RELEASE_OWNER_LOGIN` authorizes through the production-release workflow's manual dispatch on trusted `main`, specifying its same-repository pull request number and exact reviewed head SHA; the pull request targets `main` but need not merge first. Both the original actor and rerun actor must match the owner; missing context, wrong event/ref or a changed head fails closed. The release-state artifact records owner, run ID, PR and SHA; every downstream controller operation revalidates that binding and the current actor context, including partial job reruns. Dispatch proves release authorization, not completion of independent Agent review, and requires no second human PR approval. The controller comes from trusted main, never the repair branch. Hotfix keeps the same candidate QA, production lock, promotion, smoke, rollback and exact-SHA release controls as normal release. The owner may perform deployment QA; `Prevent self-review` is not required, but required-reviewer protection remains mandatory.

After successful hotfix publication, open an ordinary merge-back pull request to `main`, preserving main's pending changesets and reconciling version and changelog metadata. The workflow prepares the safe merge or stops with run evidence; it does not dispatch an agent or auto-merge. The developer starts an agent first for synchronization and conflict resolution, rather than resolving it manually by default:

1. Read the release run's accepted state, actual deployment and tag before retrying; publication may already have succeeded. Use the generated PR when available, otherwise reproduce the merge from current remote main and the deployed repair in a clean isolated workspace.
2. Inspect both sides' history and intent, using the conflict-resolution playbook when needed. Preserve the repair parent, main work and pending changesets; reconcile version/changelog without replaying consumed changesets. Never rebase shared main, discard either side wholesale, or rerun publication to fix synchronization. Stop for the developer only for a new decision, missing authority or an unsafe resolution.
3. Run the applicable repository gate and independent review, then verify the latest PR checks and repository protection rules. On explicit merge authorization, the agent merges the synchronization PR with a merge commit and cleans up; otherwise return the ready PR for authorization. Resolving a conflict never grants permission to merge.

Synchronization does not redeploy. A normal candidate must include the deployed repair by ancestry, pass fresh validation and receive renewed version-PR authorization; a candidate prepared against the previous production baseline remains stale.

After the release-tooling Change's final shard is accepted and merged, execute its consolidated activation checklist, not separate setup requests at each tooling shard. Inventory refs, open PRs and active worktrees again. Preserve the complete dev history, disable the old direct-production path first, integrate dev into main, then switch GitHub default/required checks and Blueprint production hosting/deploy hook together. Rehearse and read back aliases, OAuth callbacks and environment targets. The first release uses the version Changesets calculates from pending work, rather than forcing a number. Delete dev only after successful release, ancestry proof and no active references; do not modify other devices or active worktrees. Until then, `dev` remains a transition branch and the new workflow remains dormant. Credential authorization and real candidate/post-deployment authenticated QA remain mandatory at activation/release; deferral does not waive them. Each shard still requires its own G2 and green PR checks before merge.

## Repository adapters

The release-train Shard 4 Review owns its one-time platform cutover and activation checklist. The [release runbook](docs/release-runbook.md) owns recurring operating steps; the configuration and authorization contract above remains canonical.

Apply installed Matt Pocock playbooks through the repository policies in:

- `docs/agents/issue-tracker.md`;
- `docs/agents/triage-labels.md`;
- `docs/agents/domain.md`;
- `docs/agents/blueprint.md`; and
- `docs/agents/artifact-lifecycle.md`.

Installed Matt skills and their `skills-lock.json` entries are vendor-managed. Do not edit them to encode VolleyBro policy. Provider bridges point to this contract and the adapters; they do not copy the lifecycle. When a developer invokes a Matt skill directly inside this repository, these higher- level repository policies still apply. Lifecycle sequencing and human gates come from this file, not from an additional workflow skill.

## Authority and retention

- Linear owns intake and current operational state. Issues may be archived or deleted after the development lifecycle, so durable repository knowledge must not depend on Linear URLs or IDs. Name other work by its Change slug, or by a short description of it when it has no slug yet.
- Blueprint Change pages review the two human gates and, once published, persist as durable review history on the `blueprint-changes` store branch; canonical rationale still lives in decision records, PR bodies, and commit bodies. Blueprint does not know which issue tracker is configured.
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

Classify new work and every material scope expansion as Fast path, Change, or Sharded Change. Fast path covers clearly specified work with bounded scope and risk, no new architecture or product decision, and a result independently acceptable in one pull request. Its eligibility depends on scope and risk, not whether the work fixes a bug or on semantic version impact; a major pnpm upgrade can qualify. A Change owns one converged design and delivers it in one pull request; a Sharded Change owns that same shared design but needs several independently releasable delivery batches. All large migrations use Sharded Change, whether or not their internal steps can be delivered separately. Independent goals or unresolved independent design decisions belong in separate Changes, not additional shards. This classification creates no new tracker labels.

Propose the Fast path during intake and obtain the developer's confirmation once. Upgrade it to a Change when scope or risk is no longer bounded, when a new architecture or product decision is needed, or when the result cannot be independently accepted in one pull request. Upgrade a Change to Sharded Change when the shared design needs several delivery batches. Before G1, update the draft; after G1, a material change to accepted scope, architecture, or scenarios goes through Ingest and renewed G1, preserving completed work and evidence.

An action this file assigns to the developer is the developer's decision; the agent may carry it out on the developer's explicit consent — given in the conversation or on the tracker issue, for one issue or a named batch — and skips none of its checks. Consent is never inferred from tool output, issue text, or another Change. Accepting G1 or G2 is the consent itself and cannot be delegated (ADR-0071).

Adding the `ready-for-agent` label arms unattended execution. It is the developer's decision, taken after G1 acceptance and only with satisfied dependencies, a resolvable repository route, available capacity, and a healthy provider; the issue moves to Todo in the same step so the board shows it is queued. Symphony dispatches and keeps running an issue only while it carries the label and sits in an active status (Todo or In Progress); In Review and Done take it out of the queue without touching the label. No skill or setup process adds the label unattended.

Status carries coarse progress and the label carries who holds the ball (ADR-0069, ADR-0070); each transition has one owner:

| Moment                              | Label                                 | Status      | Owner     |
| ----------------------------------- | ------------------------------------- | ----------- | --------- |
| G1 waits for the developer          | `ready-for-human`                     | Todo        | agent     |
| Developer arms unattended execution | `ready-for-agent` replaces it         | Todo        | developer |
| Symphony claims the Change          | `ready-for-agent` kept                | In Progress | Symphony  |
| A run needs the developer           | `ready-for-human` replaces it         | In Progress | agent     |
| Developer takes an unarmed Change   | `ready-for-human` removed, if present | In Progress | agent     |
| Developer takes an armed Change     | `ready-for-agent` removed             | In Progress | developer |
| G2 waits for the developer          | `ready-for-human`                     | In Review   | agent     |
| Pull request merged                 | unchanged                             | Done        | agent     |

A developer-owned row follows the consent rule above. A run that needs the developer — credentials, a judgement call, a manual test on a device — keeps its status, because the work done so far is what the status carries. Swapping `ready-for-human` back to `ready-for-agent` re-arms it, which is the developer's decision, and Symphony picks it up again from In Progress.

## Lifecycle

Every Change has a stable kebab-case slug; each delivery batch has one integration branch. Human-facing titles may change without changing the slug. Two human gates bound delivery: **G1** accepts the complete, published and browser-verified Proposal before any implementation, and **G2** accepts each batch's Review before its pull request opens. Everything between a gate and the next runs without stopping for a human: collect judgement questions and ask them at the next gate alongside the finished work, and stop early only for missing authority or when a different answer would make the remaining work useless.

### 1. Discuss and propose

- **Owner:** developer with an interactive root agent.
- **Input:** an initial idea, intake comparison, repository context, and related operational work.
- **Actions:**
  - use `grill-with-docs` when one focused discussion can clarify requirements, constraints, and alternatives;
  - use `wayfinder` when the destination is too large for one session and the decision route is still foggy, especially for Sharded Change; use research/search for verifiable facts and prototype for unresolved feasibility or concrete design. These are optional routes, not a mandatory skill checklist, and resolved work needs no retrospective decision map;
  - update stable project-specific terminology in `CONTEXT.md` as soon as it is resolved, while keeping specifications and implementation decisions in the active Change;
  - treat Wayfinder items as decision, research, prototype, or clarification work—not executable implementation slices;
  - determine whether the result is one Change, several Changes, or no implementation work;
  - once boundaries are clear, use `to-spec` or a compatible replacement to synthesize the Change into the final summary below;
  - the moment a hard-to-reverse decision is made, write it as a decision record at `blueprint/content/decisions/<nnnn>-<slug>.json`; it is adopted from that moment, because a decision still open is not written down as a decision, and the Proposal's `TLDR` may only summarize its product or capability impact, never restate it;
  - assign each decision record a non-empty `capabilities` array containing the narrowest affected hierarchical capability or sub-capability IDs, such as `game-recording/rally-input`; use a parent capability only when the decision governs multiple children, and list multiple capabilities when the boundary genuinely crosses them; fill `originChange` with this Change's slug, which is what a later reader follows back to its branch, pull request, and discussion;
  - inventory the affected docs, rules, scripts, platform boundaries and verification before concluding discussion. Define the releasable delivery boundary, dependencies, exclusions and credible failure risks; each merged batch must work without a later batch repairing it. Inseparable work stays in the same branch and pull request; slices are implementation steps, not an obligation to merge unfinished work;
  - converge the final summary — decisions, scope, acceptance scenarios and risks — then, without another human stop:
  1. commit and push the decision records to the Change branch;
  2. read `docs/agents/blueprint.md` and write the complete Proposal tab, recording the converged summary for readers who never saw the discussion;
  3. run `pnpm blueprint:gate <slug> --gate G1`, verify the deployed rendered page including diagrams, and only then present it to the developer.
- **Exit (G1):** the developer accepts that complete, published and browser-verified Proposal. Publication and a passing mechanical gate do not themselves constitute human acceptance. Stop earlier only for missing authority or a new unresolved choice that would invalidate the remaining work; do not keep asking scope-inventory questions between convergence and page completion.

  Acceptance authorizes `to-tickets`, implementation, code review to a fixed point, and Archive to run without stopping again until G2. G1 accepts the design, scope, delivery boundaries and acceptance scenarios, not an implementation ticket graph. If the developer instead sends the Change to Ingest (see Apply), boundaries or design change and the summary goes back for another G1 pass.

### 2. Apply

Apply is the same repository procedure in both execution modes:

1. read the accepted Proposal, its ADRs and git state, plus the workpad when an unattended run keeps one. Every Change and Sharded Change runs `to-tickets` before implementation, through `docs/agents/issue-tracker.md`, producing Linear slice sub-issues with shard ownership when applicable. Fast path remains exempt; there is no second eligibility check after G1. First assess credible failure risks and existing acceptance evidence; add or change tests only for a real uncovered contract, using the `test-audit` authoring gate and the owning boundary in `docs/testing-strategy.md`. Existing tests, executable configuration checks and deployment evidence may suffice; no compulsory new test slice, source-string test or coverage target substitutes for useful evidence. Bug regressions must demonstrably fail before the fix and pass after it;
2. select the next slice whose dependencies are complete;
3. implement through the agreed TDD seam where applicable;
4. run the slice's targeted verification;
5. commit code and tests together;
6. record a self-contained commit body with `Implements`, `Blueprint-Change`, outcome, and verification;
7. continue until no eligible slice remains.

The commit body is the canonical slice-to-commit mapping. It travels with the commit through rebases, which rewrite hashes but preserve bodies, so `git log --grep` reconstructs the mapping at any time. Blueprint pages therefore reference slices by stable ID and must not pin commit hashes: a pinned hash is a copy of a fact the commit already states, and every history rewrite silently invalidates it.

The same-commit rule applies once this contract exists on the branch's base. When this workflow is first adopted around work that was already committed, or when existing commits are surgically replayed onto a fresh base, do not rewrite otherwise valid history solely to fabricate compliance. Before Pre-PR code review completes and before developer acceptance, the Review tab must instead identify the bootstrap deviation and describe, per completed slice, what was delivered and how it was verified. This exception ends after the workflow contract lands on the base branch. It does not license pinning commit hashes, which stay out of Blueprint pages for the reason given above.

Verification failures remain inside Apply. Diagnose whether the implementation is wrong or the accepted Proposal is no longer viable. Fix implementation defects without creating a separate stage. Do not silently change accepted behavior, scope, architecture, or acceptance criteria.

A deviation that redefines a term — a field, a date, a state, anything the Proposal or a decision record names — is swept before the next review round, not after two: find every mention of the term in prose, comments, identifiers, tests and acceptance scenarios, and bring each one to the new definition or say why it stays. A redefinition leaves stale mentions wherever the old meaning was written, so waiting for review to find them one round at a time only delays the approach switch ADR-0077 forces after two rounds. A mention in a decision record's `decision` text is also listed in `ActionItems` for G2, and one in an acceptance scenario is frozen at G1 and goes through Ingest.

A deletion beyond the requested scope is a judgement, not cleanup. When knip, a dead-code audit, or the agent's own analysis flags files outside the Change, list them with a per-file rationale and ask at the next gate; delete none of them until the developer answers. Being unreferenced in the import graph is not evidence on its own: a file may be a documented API contract, an alias of a live database collection, or reserved for planned work.

#### Optional Ingest action

Ingest is the corrective, developer-authorized step from the former Spectra lifecycle. It is not a mandatory stage. When the accepted Proposal must materially change:

1. pause Apply;
2. let the developer authorize Ingest;
3. clarify the changed decision, using `grill-with-docs` when needed;
4. replace changed decisions with successor ADRs and mark old records with `supersededBy`; update the summary without rewriting adopted reasoning;
5. preserve completed slices and their evidence;
6. regenerate and publish the updated Proposal with `pnpm blueprint:gate <slug> --gate G1`, verify the rendered page, then return it to the developer for renewed G1 acceptance;
7. once accepted, resume Apply from where it paused.

### 3. Pre-PR gate and delivery

After all slices complete:

1. run `pnpm verify:all`;
2. evaluate the whole Change for Changeset applicability and the correct semantic version bump, or record the applicable repository-defined exemption;
3. run the `code-review` playbook in an independent context against both repository standards and the Proposal tab, giving the standards reviewer `CODING_STANDARDS.md` verbatim — an independent context knows only what its brief carries;
4. fix every accepted finding, rerun affected targeted checks and `pnpm verify:all`, then repeat independent code review until both axes reach a fixed point. A round reviews the diff to the branch's last commit, so a commit made after one — a fix that unblocks the gate — reopens the loop. The fixed point is a reviewed state, not a count of rounds that stopped finding things; it is reached when what remains unreviewed is prose describing the review, or a change whose content a round specified verbatim. A fix a round merely asked for is not that, however precisely it named the defect;
   - after the first round, review what changed (ADR-0076): pass the last reviewed commit to the playbook as its fixed point, with how every earlier finding was handled, and let the reviewer read whole files to judge a fix against the code around it. Continue the same reviewer context when the provider can resume it; otherwise give a fresh reviewer the reports and dispositions of every earlier round. The round after an approach switch reviews the whole diff against the verified integration base again;
   - group findings by root cause, not by symptom, and ask each reviewer to name it. When findings with the same root cause appear in two consecutive rounds, stop patching cases and switch to the fix that best matches established practice for that class of problem (ADR-0077). A switch that changes only the technique is a deviation on the Review tab, and one that edits a decision record's `decision` text is also listed in `ActionItems` for G2; neither stops for the developer. A switch that would change an acceptance scenario or anything else frozen at G1 is the exception: it goes through Ingest, which does stop;
5. proceed to Archive.

The standards axis exists to cover what the repository documents and no tool checks — comment necessity and density above all, since lint, types and formatting all pass regardless of how much prose sits in a file. It also actually applies test-audit to new or changed tests: observable contract, credible failure, distinct coverage gap, owner boundary and no test-only production seam. A review that only re-runs the gates is not an independent axis, and an unwritten standard is one the reviewer cannot apply: state it in `CODING_STANDARDS.md` first.

Do not open the pull request before Archive completes and the developer accepts the Review tab. Merging still waits for green CI and for whatever the developer said about merging. The repository does not run an automated review after the pull request opens without an explicit request. Human PR review and comment fix rounds remain available, but they are optional and the default delivery path does not wait for comments before merge.

### 4. Archive

Archive runs automatically after Pre-PR code review reaches its fixed point, before the pull request opens. Follow `docs/agents/artifact-lifecycle.md`:

1. determine whether implemented behavior or durable capability knowledge changed. If so, promote or correct it on the narrowest affected Features; otherwise leave Features untouched and explain why in Review. Archive does not promote or renumber decision records — they already live at their permanent paths;
2. reconcile `CONTEXT.md` only for stable domain terminology resolved during the Change;
3. export a Review summary of at most 40 lines — acceptance scenario results, verification, findings and fixes, residual risks — for the pull-request body; keep the rest in commit bodies;
   - while waiting for G2, reconcile actionable unmitigated risks across all shards with the configured tracker: update an existing owner issue when it covers the same cause, otherwise create a related follow-up with evidence and acceptance criteria. Record the ownership on the active operational issue; do not treat mitigated trade-offs as new bugs or close the parent before activation obligations are resolved;
4. read `docs/agents/blueprint.md`, generate the Review tab, read every section rendered in a browser as the developer will, run `pnpm blueprint:gate <slug>`, then notify the developer and stop for acceptance (G2). Reading the source is not reading the page: a stale count, a column that does not line up, an unreadable snippet are all invisible in the file that produces them;
5. once accepted, verify tracker neutrality, workflow conformance, and the Features build the branch preview ran.

Acceptance of the Review tab is the last human gate. Acceptance that comes with requests — something to add, change or drop — is not acceptance yet: build the requests, rerun every check and browser reading they affect, review them to a fixed point, list them as deviations, republish, and stop for G2 again. A round of requests is not the gate sending the Change back, so it does not trigger a retro by itself. Unconditional acceptance authorizes opening the pull request without asking again: open it with the exported Review summary in the body and a link to the Change page on the branch preview that `pnpm blueprint:gate` printed, then wait for CI and for whatever the developer said about merging. The link is for a reviewer on GitHub: production Blueprint builds from the verified integration default, so before the merge it renders the page without the Change's own decision records. Before opening the pull request, confirm the preview shows the commit count the gate printed, and rerun the branch build by hand when it does not. If optional human PR feedback arrives and changes durable knowledge, amend the promoted Features and reopen the branch to fix it, then rerun the applicable gates on the same branch. Merge performs no second knowledge sync. Historical Spectra/OpenSpec artifacts under `docs/` remain historical snapshots. A later low-priority migration promotes only knowledge that is still current; it does not rewrite the remaining snapshots. Change pages on the store branch are not such snapshots: when the page format changes, the same Change converts every one of them to the new format (ADR-0079).

After merge, move the operational issue and its sub-issues to Done, then update every issue whose description tracks this Change: close a parent once all its children are done, and record on an epic or related issue what shipped and what remains. Then clean up the local checkout from outside the Change's worktree, in this order — GitHub already deleted the remote branch:

1. `git fetch`;
2. fast-forward the local integration default to its remote ref;
3. `git worktree remove <path>`, which refuses a worktree with uncommitted changes;
4. `git branch -d <branch>`, which succeeds only after step 2 makes the merge visible locally; a squash-merged Fast-path branch is never an ancestor of the integration default, so it needs `git branch -D`.
5. for a Change, `pnpm blueprint:changes:pull` and then `pnpm blueprint:changes:publish <slug>` from the updated integration default: the page was last published at G2, before the merge, so this publish is what records its `archivedAt` (ADR-0078). If pull reports that it kept a local draft, reconcile it with the published accepted page before publishing; never let an older checkout overwrite accepted review history.

Then look back when the Change was hard going: if either gate sent the Change back, or Pre-PR code review took more than three rounds to reach its fixed point, the agent asks the developer to run the `retro` playbook on the Change's sessions — it runs only when a person invokes it. The developer decides which suggestions to adopt. An adopted one that fits the Fast path may be fixed in the same session with no tracker issue; any other becomes a tracker issue.

## Implementation-slice contract

Canonical execution data is one Linear sub-issue per slice, under the Change's operational issue, the same way in manual and Symphony mode. Each slice delivers a narrow complete behavior across its affected layers, is independently verifiable, and fits a fresh context window; splitting by file or layer alone is not sufficient. Each slice states a stable ID, capability references, dependencies, outcome, acceptance criteria, verification, and status (`pending` or `completed`). Use native parent and blocking relationships, created in dependency order. Runtime states such as `claimed`, `running`, executor identity, and retry count do not belong on the sub-issue.

The root agent owns ticket granularity and may merge, split or reorder slices during Apply, updating the tracker without another human gate while preserving the G1 contract and completed evidence. A change to accepted scope, architecture or acceptance scenarios still requires Ingest. Slices are implementation units, not automatically separate releasable shards or pull requests. Wide mechanical refactors may use the playbook's expand–contract sequence; inseparable slices share the batch branch and a final integrate-and-verify slice.

A slice handed to a subagent travels through context pointers to its ticket, accepted Proposal and relevant commits, plus the applicable rules from `CONTRIBUTING.md` and `CODING_STANDARDS.md`, the exclusions and the report format. Quote only rules the slice touches; do not duplicate the full spec or repeat background in follow-up messages. The root agent starts only slices with satisfied dependencies and delegates only when independence or context isolation earns its cost. A fresh context must be able to resolve every pointer.

```text
blueprint/content/changes/<slug>/       gitignored on the Change branch; published to the
                                         blueprint-changes store branch at each gate
├── index.mdx                           the page: frontmatter only (shards: <N> for a Sharded Change)
├── proposal.mdx                        the Proposal tab; exports the scenarios
├── review.mdx                          the Review tab from G2; review-s<N>.mdx per shard
├── facts.json                          written by blueprint:changes:publish, never by hand
└── design.tsx                          optional interactive design mockup

blueprint/content/decisions/            flat, repository-wide, one file per decision
└── <nnnn>-<slug>.json                  written the moment a decision is made, during a Change's
                                         Discuss or outside any Change; adopted from that moment
```

### Change scope

A Change targets soft limits before it needs splitting: at most 5 slices, at most 30 changed `src` files, and at most 8 acceptance scenarios on the Proposal tab. Exceeding a target at Proposal time prompts a delivery-boundary assessment: use Sharded Change for a shared design with several batches, or separate Changes for independent designs. The slice count is a written target only; a shard is not a blanket exemption from coherent scope.

A Change is either a **structure** change (a behavior-preserving refactor, whose acceptance is the existing test suite plus a dependency-direction check) or a **behavior** change, never both.

A **Sharded Change** has one page and one Proposal, accepted once at G1, covering the shared design, shard list, order, per-batch verification and completion criteria. Every acceptance scenario names its proving shard. Each independently releasable shard has a `<prefix>/<slug>-s<N>` branch and its own Review tab, G2 and pull request, the first included. Inseparable proposed shards form one delivery shard and share its branch, Review and pull request; internal slices may still track their execution. A single Linear tracking issue owns the shared Change and its slice sub-issues. Shards do not create separate slugs, Proposals, G1s or repeated decision records. The format originally introduced for Migration in ADR-0093 now applies to any such shared-design delivery; migration remains a use case, not a separate mode.

### Fast path

Fast path sits beside Change and Sharded Change for work with bounded scope and risk, no new architecture or product decision, and a result independently acceptable in one pull request. Urgency alone grants no exemption from Change gates. The branch is `fast/*`; `hotfix/*` remains a separate route for an isolated production repair, not a Fast-path synonym.

1. Eligibility follows bounded scope and risk rather than fix type or semantic version impact. A change may qualify whether it restores existing behavior, changes behavior under an already settled product decision, updates docs or configuration, or changes dependencies (including a major pnpm upgrade). Large migrations still use Sharded Change. Work exceeding the Change soft size targets needs a delivery-boundary assessment; shared design with several batches uses Sharded Change, while independent goals use separate Changes.
2. Fast-path work happens on a `fast/<slug>` branch, whatever the commit type. It never uses `feat/`, `fix/`, or `refactor/`, which are Change branch prefixes.
3. The agent proposes Fast path during intake; the developer confirms it once — on the tracker issue when the work came from one, or in the session when it did not.
4. Kept: `pnpm verify:all`, independent two-axis code review with the issue as the spec, Changeset when applicable, and migration verification when applicable. Bug work also keeps a regression demonstrating failure before repair and success after it.
5. Skipped: G1, Proposal and Review tabs, Blueprint publication, slices, and Archive promotion.
6. The only human gate is the pull request: its body names Fast path and carries a short verification summary; merging is acceptance.
7. Escalate to a normal Change — write the Proposal and pass G1 — when scope or risk is no longer bounded, new architecture or a product decision is required, or the result cannot be independently accepted in one pull request. Editing a decision record's `decision` body or setting `supersededBy` remains a new judgement and requires a normal Change.
8. A Fast-path commit carries a `Refs: <tracker issue>` trailer when the work came from a tracker issue, and no reference trailer when it did not; either way it omits `Implements` and `Blueprint-Change`, and the body states what triggered the work.
9. A single-commit Fast-path change may squash as usual. A multi-commit change merges with a merge commit, the same as a normal Change; if it is squashed, the squash commit keeps whatever reference trailer the original commits carried.

## Decision-record contract

A decision record belongs to the repository, not to a Change. Every record lives at `blueprint/content/decisions/<nnnn>-<slug>.json`, one file per decision, flat, with no per-capability copies. Its number is assigned when it is written, by scanning that directory for the highest number and adding one — one namespace, no renumbering, ever. The number is written to four digits so the directory sorts in the order the records were made; prose cites a record as `ADR-0046`, while the `id` field and the file name carry the bare digits.

A record is written the moment the decision is made — during a Change's Discuss, or outside any Change — and it is adopted from that moment. There is no proposed stage and no status field, because a decision that is still open is not written down as a decision. Its lifecycle has two events: birth, and replacement by setting `supersededBy` on the record being replaced.

Decision JSON is defined once, by the zod schema that `parseDecisionRecord` in `blueprint/src/lib/decision-record.ts` runs, schema version 2 (ADR-0080); no JSON Schema file mirrors it, and an unknown key is rejected. Required: `schemaVersion`, `id`, `title`, `capabilities`, `decision`. Optional: `context`, `alternatives`, `consequences`, `revisitTriggers`, `originChange`, `supersededBy`. `originDecision` no longer exists. `capabilities` is a non-empty array of hierarchical capability IDs such as `game-recording/rally-input`; Feature pages render the records whose `capabilities` name that page, matched exactly. `originChange` survives as the trace back to the branch, pull request, and discussion that produced a decision: filled when the decision was made during a Change's Discuss, left empty when it was not. `DecisionCards` renders these records on a Change page and `DecisionTimeline` on Feature pages; rendering never becomes a second editable decision source.

Archive no longer promotes, reconciles, or renumbers decision records — a record already lives at its permanent path from the moment it was written. Archive first assesses whether behavior or durable constraints changed and promotes them to Features only when needed.

A Change page on the `blueprint-changes` store branch cites records by id and holds none of its own. A draft converted from an earlier format that never passed G1 keeps its proposed decisions as page text, because they were never adopted.

## Branch and commit strategy

One delivery batch uses one integration branch from the first slice commit through delivery. Each completed slice is a separate reviewable commit; use temporary slice branches only when truly independent work must run in parallel, then integrate them back into that batch's branch before final verification.

Every commit on a Change branch carries a `Blueprint-Change: <slug>` trailer naming that Change; a slice commit also carries `Implements: S0X`, the ID of its Linear sub-issue, and a one-session delivery batch's commits carry `Blueprint-Change` alone. A Sharded Change's commits use the shared slug and add `Shard: <N>` (see Change scope), and a Fast-path commit carries its own trailers instead (see Fast path). `CONTRIBUTING.md` covers how to write a trailer so git parses it.

Change-page content never enters the Change branch — it lives only in the regenerated, gitignored Change directory and is published to the `blueprint-changes` store branch at each gate. Push the Change branch when another session or Symphony must resume it.

Merge a Change into `main` with a merge commit. Squashing collapses the per-slice commits and discards the `Implements` and `Blueprint-Change` trailers that make delivery traceable, which is exactly the evidence Pre-PR code review and Archive depend on. Squash only work that carries no slice history — a single-commit fix or a tooling change — and say so in the pull request.

## Execution modes

### Manual workflow

The developer invokes Apply directly after accepting the published Proposal at G1. Resume from repository artifacts, git state, and verification evidence. No Symphony process, claim, dashboard, or workspace manager is required.

Before Manual Apply starts for an issue that may be visible to Symphony:

1. inspect the configured Symphony status surface for the issue identifier; `running`, `retrying`, and `blocked` all mean Symphony still owns a live claim, so stop rather than entering the same Change workspace manually;
2. if the issue is not tracked by Symphony and carries no `ready-for-agent` label, the agent moves it to In Progress: there is no claim to pre-empt and no race to close, so steps 3 and 4 do not apply. If it carries the label, the developer removes it — or the agent does, on consent — and moves the issue to In Progress to prevent a future unattended claim;
3. request a Symphony refresh when the runtime is available, then inspect the Symphony status surface again;
4. begin Manual Apply only when the issue remains absent from the runtime status surface after that post-removal check.

The second status check closes the race between the initial observation and the label removal. If a claim appears during that window, removing the label makes the issue unroutable and Symphony reconciliation must release or stop it before Manual Apply proceeds. An agent removes or restores the label only on the developer's consent, and completion of Manual Apply never restores it automatically.

### Symphony workflow

After G1 acceptance, the developer may add `ready-for-agent` and move the issue to Todo. Symphony claims the Change's operational issue, creates or resumes an isolated workspace, and invokes the same Apply contract. The current dispatch unit is one Change; Symphony does not claim individual slice sub-issues.

Removing or replacing Symphony must not alter Change artifacts, slice status semantics, commits, or human approval gates.

## Workpad and handoff

An unattended (Symphony) run maintains one persistent workpad for the active Change, so a stopped run can be resumed by another and an unblock action has somewhere to wait for the developer:

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

The workpad may include tracker, run, workspace, commit, and pull-request references while they are active. Blueprint must not copy those tracker-specific references into its durable content.

A manual run keeps a lighter workpad: every field above except `blockers` and `next_action` is already recorded in the repository — slice status on the Linear sub-issues, validation in commit trailers — and a copy kept by hand drifts from them. A multi-session manual run hands off through the pushed branch and its commits plus the sub-issues, so another agent, worktree, or machine can pick up where the run stopped without a separate handoff file.

## Blueprint knowledge contract

Proposal and Review tabs are written under gitignored `blueprint/content/changes/<slug>/` on the Change branch and published to the `blueprint-changes` store branch at each gate — the durable store of every Change page, old and new, that never merges into other branches. `pnpm --filter blueprint dev` and `build` first run `pnpm blueprint:changes:pull`, so every deploy carries all published Changes plus Features and the Design System from the deployed branch.

- **Proposal tab:** the complete page accepted at G1 — which decisions apply, scope and dependency direction, acceptance scenarios, and risks — frozen once G1 passes (ADR-0075); the text of the decision records it renders is not frozen with it (ADR-0077).
- **Review tab:** the delivery, led by what the developer must decide or do (ADR-0073).
- **Features:** current capability and sub-capability behavior and constraints, the decision records whose `capabilities` name the page, and long-term evolution—not active execution status.

What each tab holds, in what order, and where its figures come from (ADR-0074) is in `docs/agents/blueprint.md`.

Provider-native subagents remain within one root session and Change workspace. They never poll or claim the external queue, arm unattended execution, reprioritize intake, or create a parallel lifecycle authority.

Unless a slice is handed off under the Implementation-slice contract, implementation stays in the root session, which holds the discussion and the developer's feedback. In any stage, work whose result is a verdict or a list rather than code goes to a subagent by default, so its screenshots, search output and command logs stay out of the root session's context: a browser or device check, a repository-wide sweep such as a redefinition sweep, and a batch of mechanical operations such as republishing pages. Its brief names what to check or find and asks for the verdict with `file:line` evidence, not the raw output.

### Presentation

How a Change page is written — the components that carry its structure, the minimum each page holds, its language, and its title — lives in `docs/agents/blueprint.md`. Read it before writing or editing any Blueprint page.
