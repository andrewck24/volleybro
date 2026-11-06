# Release contract

This file is VolleyBro's canonical release policy: what must hold for code to reach production, who may decide each step, and what recovery may do. [`WORKFLOW.md`](../WORKFLOW.md) links here and owns the delivery lifecycle up to merge. [`release-runbook.md`](release-runbook.md) owns the operating steps and does not repeat these rules. The release controller (`scripts/release-controls.js` and `scripts/release-controls/`) and `.github/workflows/production-release.yml` implement and verify the rules; where a rule is a mechanical check, it names the module that enforces it, and that module's tests and failure messages describe the check in full (ADR-0083).

## Principles

- **Integration is not release.** `main` is the sole permanent integration trunk; there is no permanent production branch. Production is an explicitly selected deployment of an authorized, immutable revision, never the branch tip. Integration and production keep distinct deployment configuration. A moving branch cannot tell what production runs, so maintainers keep a reliable mapping from production to its deployed revision.
- **Release QA proves source and environment separately.** Source functionality, the production-config candidate's identity and live production authentication are three separate proofs. A Preview proves application behavior only when bound to the release source and never certifies production OAuth, so an OAuth failure may first show after promotion. Recovery evidence is required before promotion, and a successful tag or Release is published only after live acceptance.
- **Emergency repairs release only the repair.** A hotfix branches from the deployed revision, not from `main`, and merges back into `main` without rewriting shared history. A later normal release must contain the deployed repair.
- **Human cost first, agent cost second.** Do not duplicate CI or ask for manual functional retesting when sufficient evidence already exists.

## Authorization

- A normal release uses the rolling `changeset-release/main` version PR with title `release: update versions`. Its merge authorizes its fixed merge SHA, containing all integrated work up to that revision; later `main` commits do not replace it.
- The version bot uses a PAT/App-backed `RELEASE_TOKEN`, so PR checks actually run; `RELEASE_BOT_LOGIN` must match that token's authenticated author. `Verify` and `Vercel` must pass on the latest authorized PR revision. Vercel's preview build is not production smoke.
- The release owner's merge of the version PR starts the run as a push to `main`, so the main-only production QA environment accepts it. A push that merged any other PR ends without a release. A missing or ambiguous PR, a non-owner merge, a version PR that did not land as a merge commit (squash or rebase) or failed validation fails the run, push and `normal-retry` alike, before anything is staged.
- To retry a failed run, or to release after a non-owner merge, the release owner dispatches `production-release.yml` on trusted `main` with mode `normal-retry`, the merged version PR number and its exact merge SHA. The same dispatch retries after a release-controller-only correction. This is a fresh run, not a new application version: a controller-only correction with no app impact needs no Changeset. Never replace the controller or evidence in an old run.
- Only `hotfix` mode prepares a merge-back PR.

Invariants:

- The version PR is identified by API, never by commit message or branch name alone; the title exception validates author identity, same-repository base/head and a metadata-only diff. Push and dispatch share one validation of identity, metadata-only diff and required checks, and required checks come from trusted providers. (`authorize.js`: `mergedPullsForPush`, `validateMergedVersionPr`, `validateVersionPr`, `verifyMetadataOnly`, `validateRequiredChecks`)
- A dispatch's controller contains the authorized merge by ancestry. The push path needs no ancestry check: its controller is the pushed commit's first parent, the trusted `main` before the merge. (`authorize.js` `authorizeRetry`; `core.js` `assertAncestor`)
- The authorization artifact binds the original and rerun actor, run ID, PR and source SHA, and every downstream job revalidates it. (`core.js`: `releaseOwnerContext`, `validateReleaseAuthorization`)

## Configuration

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

The Vercel project's Root Directory stays `./`, because `stage` checks only the checkout root for files the Vercel CLI would run or load.

## Environments and data

- Daily `main` pushes deploy nothing. Native Git deployment of `main` is disabled in `vercel.json`, so an ordinary merge cannot move the production domain. PR previews and the fixed manual `volleybro-test.vercel.app` environment remain available ([deploying it](release-runbook.md#test-project-deployment)).
- Production uses the Atlas `production` database and its scoped DB user; previews, Development and `volleybro-test` use `test` through a separate DB user scoped to that database. Each environment has its own auth secret. The production database was activated before v1.0 with every existing record retained (ADR-0141).
- Integration tests keep their isolated `mongodb-memory-server` replica set. Never reset the shared test database for a PR.
- Run any data migration from a developer machine with a dedicated credential in `MIGRATION_MONGODB_URI`; the application must never read that credential.

## Source evidence and candidate verification

- A normal release stages production configuration with `--prod --skip-domain`. CI owns routine unit and integration execution; production-release never reruns the routine source suites and has no release-only source Preview or manual source-evidence approval lane.
- Missing or mismatched source evidence stops the release until CI supplies valid evidence, and a fresh authorized run is required after evidence is corrected. Never use a matching version number as proof for another source.
- Before promote, Vercel API read-back proves candidate readiness, identity, production target, protection and baseline; no unauthenticated candidate HTTP probe or OAuth bypass is required. See [CLI Skip Domain](https://vercel.com/docs/cli/deploy#skip-domain) and [Standard Protection](https://vercel.com/docs/deployment-protection#standard-protection).

Invariants:

- A CI scope is reused only when native CI steps identify the tested commit and its complete Git tree equals the authorized source tree; commit SHAs may differ, but producer workflow, repository, run attempt and scope must be trusted. (`core.js`: `sourceScopeEvidence`, `verifyReusableSourceQA`; `stage.js`: `recordSourceQA`)
- Vercel may assign generated aliases despite `--skip-domain`, which controls custom production domain assignment. Staging and promotion require project-bound Standard Protection (`all_except_custom_domains`) and a complete project domain inventory. Only aliases Vercel marks as automatically generated and absent from that inventory are permitted; configured or unknown aliases fail closed. The formal production alias is a production domain of the bound project and keeps the recorded baseline after staging. (`core.js`: `stagingDomains`, `validateCandidate`, `assertBaseline`)
- pnpm runs the Vercel CLI from the controller directory with `--cwd` pointing at the candidate checkout. A candidate whose root holds `vercel.{ts,mts,js,mjs,cjs}` or `.env*` (except `.env.example`) does not stage. (`stage.js`: `stage`, `assertNoCliLoadedFiles`)

## Promotion and publication

- Promotion, rollback, owner recovery and finalization share a job-level production lock; human QA waits do not hold it. Production queues use GitHub's `queue: max` with cancellation disabled, so later work does not replace a pending operation within the platform's queue limit. (`production-release.yml` `concurrency`)
- The actual production alias baseline is rechecked inside the lock; a changed baseline invalidates the candidate. A failed or pending candidate never promotes. (`promote.js` `promote`)
- After promotion, acceptance (below) must succeed before an exact-SHA tag and GitHub Release are created. Retries never move an existing tag. Release failure is not release success. (`finalize.js` `finalize`; `core.js`: `assertTagSha`, `assertExistingTagSha`)

## Recovery evidence and data compatibility

- Production data is always forward-only. Recovery may restore only code at the exact proven baseline; never roll back production data. A post-deploy failure may return only to a recorded, proven database-compatible deployment, verify it and notify; unknown or incompatible database state, including a forward-only release, stops and notifies without data rollback.
- Classify changed paths as known-unrelated or persisted-contract risk. An unclassified path stops before promotion, never counts as "unchanged", and CI fails the pull request that adds it, so the pattern is added before release. Database schemas/mappings, entities, write use cases/repositories, API/auth/session paths, dependency-lock/config changes, and any other app source under `src/` not known to be unrelated are conservative contract risks. A `package.json` version-only change is unrelated; dependency fields trigger the proof, and other unclassified manifest changes stop. Known-unrelated paths reuse trusted unit/integration receipts. (`core.js`: `changedSourcePaths`, `persistedContractChanges`; `stage.js` `checkPathClassification`)
- For a contract-risk change while production data is active, when `test/integration/persistence/release-compatibility.itest.ts` exists in the release source, the run executes that dedicated exact-baseline compatibility suite: conditional data-risk evidence, not a rerun of general functional QA. It proves both directions: the candidate reads the still-supported legacy records, and the code at the exact recovery-baseline SHA reads records written by the candidate. It may reuse existing coverage; modify coverage only when current tests do not prove the new risk. No routine shared-DB audit or baseline→candidate→baseline suite is required.
- A present suite that is incompatible or skipped, and any unclassified path, stops promotion and reports what is absent; per-release text variables or an approval click cannot supply it.
- When the suite file is absent, a contract-risk release still promotes but is recorded forward-only: rollback is unavailable, `rollback` and `mode=recover` stop and notify, repair is a forward fix, and the run summary and GitHub Release state `Forward-only: no rollback to <baseline>`.

Invariants:

- Release state uses contract v4; older state and receipts are rejected. The schema-2 recovery receipt records `database.productionActive: true` as a current fact. (`core.js`: `RELEASE_STATE_VERSION`, `loadState`)
- Candidate tests run in their own job without a GitHub token. The receipt is written by a separate job on a fresh runner that runs only the trusted controller, recomputes the plan and checks the test job and step natively. (`recovery.js` `recordRecoveryEvidence`; `core.js` `recoveryReceiptFacts`)
- The compatibility proof is one non-skipped Jest suite with both passing assertions, the baseline SHA in the baseline-reader assertion title; a green job, passed exit code or SHA environment variable alone is not proof. (`core.js`: `recoveryCompatibilityPlan`, `nativeCompatibilityJob`; `recovery.js` `verifyCompatibilityReport`)
- Before promote, a short-lived receipt is bound to the exact recovery baseline, candidate, source tree, release mode and workflow run. (`core.js` `verifyRecoveryEvidence`)
- Rollback requires the accepted compatibility evidence; a forward-only release has none. (`recovery.js`: `assertRollbackAllowed`, `rollbackIfCompatible`; `core.js` `forwardOnlyNotice`)

## Post-promotion acceptance

After promote, acceptance follows one rule, for normal and hotfix releases alike.

- The workflow runs the automated Production smoke test (see [GLOSSARY.md](../GLOSSARY.md)) against the formal alias with trusted `main` code: Google OAuth configuration, a valid test-account session and a read-only test team page, in Chromium and WebKit, bound to the promoted deployment before and after the run.
- A regression, including an alias that is not this candidate, takes the compatibility-checked rollback. An infrastructure failure (the test session was already invalid, or the smoke run produced no report) never rolls back. A failed classification waits at the gate.
- When smoke passes and the release changed no authentication, the run finalizes without a reviewer.
- The `production-release-review` gate is needed only when smoke fails as infrastructure, the release changed authentication (auth paths, the `better-auth` version or Vercel `BETTER_AUTH_*`/`AUTH_GOOGLE_*` configuration since the baseline), or that cannot be determined. The reviewer performs only a live Google sign-in with session check and the read-only team check on the formal alias, not a full functional retest.
- Independently of releases, the owner performs a full manual Google sign-in at least monthly. A pre-created session does not prove Google OAuth; smoke is read-only, covers only these three checks and does not replace full OAuth verification or end-to-end tests. No production login bypass is permitted. Session upkeep and revocation are in the [runbook](release-runbook.md#smoke-session).

Invariants:

- The controller classifies the smoke result and decides whether authentication changed. (`promote.js`: `smokeOutcome`, `classifySmoke`, `authChange`)
- Exactly one of the two acceptance receipts, smoke or reviewer, is bound to this run and exact deployment before finalization; missing proof cannot create a success tag or Release. (`promote.js`: `recordSmokeAcceptance`, `recordProductionQA`; `finalize.js` `assertSingleAcceptance`)

## Owner recovery

For a promoted run left pending or cancelled, the configured release owner may dispatch `mode=recover` on trusted `main` with the original release run ID. Recovery restores only the accepted compatible baseline when the live alias still points at that candidate, then checks public health and reports the result. It never rolls data back, creates a tag or republishes. Expired or missing evidence, or a changed alias, stops. This is an explicit recovery entry point, not timeout automation; code rollback does not guarantee repair of OAuth or shared configuration.

Invariants:

- Recovery accepts original runs started by `push` or owner dispatch. (`recovery.js` `validateOriginalAuthorization`)
- Under the production lock, the new controller validates the original workflow and repository, owner context, accepted artifact provenance and expiry, source and reviewer receipts and exact deployment bindings. (`recovery.js`: `recoverVerify`, `validateOriginalAuthorization`, `downloadAcceptedState`)

## Hotfix

- An urgent production bug or security repair uses `hotfix/<slug>` from the actually deployed, tagged revision, not the integration tip. Prepare its patch version and changelog on that isolated branch. (`core.js` `verifyHotfixMetadata`)
- After the repository's independent agent review and latest trusted checks, the configured `RELEASE_OWNER_LOGIN` authorizes through the production-release workflow's manual dispatch on trusted `main`, specifying its same-repository pull request number and exact reviewed head SHA. The pull request targets `main` but need not merge first.
- Dispatch proves release authorization, not completion of independent agent review, and requires no second human PR approval. The controller comes from trusted `main`, never the repair branch.
- Hotfix keeps the same automated source evidence, production lock, promotion, post-deployment smoke, rollback and exact-SHA release controls as a normal release. The owner may perform deployment QA; `Prevent self-review` is not required, but required-reviewer protection remains mandatory.

Invariant: the original and rerun actor must match the owner; missing context, a wrong event or ref, or a changed head fails closed. The release-state artifact records owner, run ID, PR and SHA, and every downstream controller operation revalidates that binding and the current actor context, including partial job reruns. (`authorize.js`: `authorizeHotfix`, `validateHotfixPr`; `core.js`: `releaseOwnerContext`, `validateReleaseAuthorization`)

## Hotfix synchronization

After successful hotfix publication, the workflow opens an ordinary merge-back pull request to `main`, preserving `main`'s pending changesets and reconciling version and changelog metadata. It prepares the safe merge or stops with run evidence; it does not dispatch an agent or auto-merge (`finalize.js` `prepareMergeBack`). The developer starts an agent first for synchronization and conflict resolution, rather than resolving it manually by default:

1. Read the release run's accepted state, actual deployment and tag before retrying; publication may already have succeeded. Use the generated PR when available, otherwise reproduce the merge from current remote `main` and the deployed repair in a clean isolated workspace.
2. Inspect both sides' history and intent, using the conflict-resolution playbook when needed. Preserve the repair parent, `main` work and pending changesets; reconcile version and changelog without replaying consumed changesets. Never rebase shared `main`, discard either side wholesale, or rerun publication to fix synchronization. Stop for the developer only for a new decision, missing authority or an unsafe resolution.
3. Run the applicable repository gate and independent review, then verify the latest PR checks and repository protection rules. On explicit merge authorization, the agent merges the synchronization PR with a merge commit and cleans up; otherwise return the ready PR for authorization. Resolving a conflict never grants permission to merge.

Synchronization does not redeploy. A normal candidate must include the deployed repair by ancestry, pass fresh validation and receive renewed version-PR authorization; a candidate prepared against the previous production baseline remains stale.
