# Release operations

Use this runbook after the release-train platform cutover. Its one-time activation checklist lives in the Change's Shard 4 Review. [WORKFLOW.md](../WORKFLOW.md) owns configuration, authorization, deployment boundaries and recovery policy; this document owns recurring operating steps, not a second copy of those rules.

## Before a release

1. Confirm the approved GitHub secrets/variables and protected environments in WORKFLOW.md. CI credentials belong in GitHub, not `.env.local` or `.env.example`; verify actual repository/project/team scope without printing secrets. Recheck reviewers and access when configuration changes.
2. Read the current production deployment ID, immutable URL, source SHA and tag. Unknown source identity or DB compatibility is a stop, not a reason to invent a baseline.
3. Inspect any existing production run before starting another. Production mutations/finalization share a lock; QA waits do not hold it, allowing owner recovery while a run waits. Do not cancel an ambiguous promote/rollback or bypass approval for an urgent repair; stale candidates still fail baseline checks.

## Normal release

1. Inspect `changeset-release/main`, title `release: update versions`, its bot identity and latest required checks. Main pushes with pending changesets prepare it automatically when release automation is enabled. Without a new push, use `gh workflow run changesets.yml --ref main`; this prepares versions only, not release authorization.
2. Inspect `pnpm changeset status` and the latest version PR. The developer merges or explicitly authorizes the Agent to merge it; that merge fixes the release source SHA. Later main commits do not replace this candidate. There is no scheduled automatic merge.
3. The release owner's merge starts `production-release.yml` as a push to `main`; a push that merged any other PR ends without a release. If the run fails or someone else merged, the owner dispatches it from `main`: `mode=normal-retry`, `pull_request` set to the merged version PR number and `sha` to its full merge SHA. Actions stage the production-config deployment and assemble source evidence from native CI receipts. Reuse a scope only when its trusted producer tested the same complete Git tree as the authorized source. If an older exact application SHA lacks receipts, run `gh workflow run ci.yml --ref main -f source=<exact-application-SHA>` on the trusted main revision used by the fresh controller, then wait for Test and Integration; this CI-only mode uses no app secrets or environment and does not change the app tree/version. When production data is active, a contract-risk change runs only the dedicated exact-baseline compatibility suite when it exists, and it must report both required directional assertions as passed with none skipped; without the suite the release promotes as forward-only (no rollback or recover to the baseline; repair is a forward fix) and the run summary and Release say so; unclassified paths stop before promotion. Routine unit/integration suites are not rerun. Read the authorize and candidate jobs' API validation logs and the `Verify release recovery evidence` job summary. Missing, mismatched or stale source evidence is a hard stop: fix its source or coverage, then start a fresh authorized run. Do not create a release-only Preview, set per-release evidence variables or approve an evidence-only gate. WORKFLOW.md defines the recovery-proof contract and when an Agent is needed.
4. Actions recheck the baseline under the lock, promote and run the automated production smoke. The post-promotion acceptance rule in WORKFLOW.md decides whether the run finalizes by itself or waits at the protected gate; when it waits, the reviewer performs the live checks that rule names at the formal alias.
5. Verify the final deployment/source SHA, exact-SHA tag and GitHub Release. Failed or pending QA is not release success. Record the run evidence on the operational issue.

If a normal release run failed, the version PR was merged by someone else, or a controller-only correction was merged afterwards, dispatch `normal-retry` with the same inputs. Use the fresh run's candidate and production-QA gate; do not rerun the old controller or bump the app version just to retry deployment. Existing hotfix dispatches use `mode=hotfix` (the default).

## Smoke session

The smoke test uses a Google test account's real session, exported as Playwright `storageState` (the Better Auth session cookie only) and kept as the `SMOKE_STORAGE_STATE` secret of the `production-smoke` environment. A scheduled keepalive extends it every 3 days; GitHub's failure notification for that workflow means the session is no longer valid. A release run that reports a smoke infrastructure failure has either a failed session check or no smoke report at all (runner or install failure); the Production smoke job log tells which, and only the first needs a re-login.

Re-login and refresh:

1. Sign in to the formal production site as the test account in a clean browser profile, using the real Google flow.
2. Export `storageState` (for example with `npx playwright codegen --save-storage=state.json https://<production alias>`), keep only the `better-auth.session_token` cookie and the suite injects it as a session cookie, so its expiry does not matter.
3. Replace the `SMOKE_STORAGE_STATE` secret in the `production-smoke` environment, delete the local file, and dispatch the keepalive workflow from `main` to confirm it passes.

A run stopped at the manual gate by an infrastructure failure is accepted normally; refresh the secret afterwards when the session check was the cause. Re-login does not need a release.

## Revoking a leaked smoke session

The session secret is a bearer credential for the test account only: a read-only member of the test team, with no write rights elsewhere. If it may have leaked (printed in a log, an artifact, a screenshot or a shared file):

1. Delete the leaked session from the production database, not the test one: in the `sessions` collection remove the document whose `token` equals the cookie value up to its first `.` (URL-decoded). If the token is unknown, delete every document with the test account's `userId`.
2. Perform the re-login procedure above to create and store a new session. Confirm the old cookie now fails `get-session`.
3. Rotate the production `BETTER_AUTH_SECRET` only when the signing secret itself may be exposed, since cookie signatures could then be forged for any user. Rotation signs every user out and needs a production redeploy, so treat it as an incident and not as routine cleanup.

## Test project deployment

Real-device acceptance of an auth-gated page runs on the test project. Confirm the deployment project is the unprotected `volleybro-test`, not the formal `volleybro` project. Use the globally installed Vercel CLI when available; fall back to `pnpm dlx vercel` only when it is absent. Confirm authentication before deploying; `--prod` selects the test project's Production target, not the formal site's project.

```sh
git status --short && {
  if command -v vercel >/dev/null 2>&1; then
    vercel --prod --yes
  else
    pnpm dlx vercel --prod --yes
  fi
}
```

Do not fall back after an installed CLI fails: resolve authentication or deployment errors instead. Hand out `https://volleybro-test.vercel.app`, never the org-suffixed alias, which redirects to SSO.

## Dependency maintenance

Follow [maintenance-policy.md](maintenance-policy.md) for schedules and Agent collaboration. Treat graph coverage, alert visibility and native updater compatibility as separate proofs; local SBOM generation or upload success alone is insufficient. Keep the relevant automation flag false when its proof fails or is unavailable. New workspaces require submission mapping and graph read-back.

## Hotfix and recovery

1. Use `hotfix/*` from the verified deployed tag/SHA and prepare the isolated patch version/changelog. Complete independent Agent review and inspect the latest trusted checks. The configured release owner dispatches `production-release.yml` on `main` with `pull_request` and `sha` set to the PR number and its exact reviewed head SHA. Inspect the authorization record in the run log; a changed head requires fresh review, checks and dispatch. Apply the same candidate and production QA as normal release; dispatch is not a substitute for review. The owner may approve these protected QA jobs without a second account.
2. After publication, the developer starts an Agent first for merge-back. Read the accepted run, deployment and tag before retrying; use the generated PR when available. Preserve the repair parent, unpublished main work and pending changesets, with fresh checks and explicit merge authorization. Follow WORKFLOW.md's synchronization steps; do not rebase shared history or republish to resolve a merge conflict.
3. For failed checks or unknown metadata, leave the formal deployment unchanged and record the failure. Rollback requires the accepted artifact's exact current-DB compatibility evidence, then health verification; unknown compatibility or a forward-only release means stop and notify, never reverse data.
4. If a promoted run is cancelled or remains pending, inspect its live state first. The configured owner dispatches `production-release.yml` on `main` with `mode=recover` and the original run ID. Use the original accepted artifact while it is retained; the controller validates its provenance, machine-verified recovery receipt, data-compatibility policy and live alias under the lock before restoring the recorded compatible baseline. Legacy artifacts, missing/expired proof or a changed alias require a fresh authorized release run or recovery decision; do not reinterpret artifacts, invent a baseline or republish. The recovery summary reports health without creating a success tag/Release.
