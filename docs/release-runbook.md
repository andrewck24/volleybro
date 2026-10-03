# Release operations

Use this runbook after the release-train platform cutover. Its one-time activation checklist lives in the Change's Shard 4 Review. [WORKFLOW.md](../WORKFLOW.md) owns configuration, authorization, deployment boundaries and recovery policy; this document owns recurring operating steps, not a second copy of those rules.

## Before a release

1. Confirm the approved GitHub secrets/variables and protected environments in WORKFLOW.md. CI credentials belong in GitHub, not `.env.local` or `.env.example`; verify actual repository/project/team scope without printing secrets. Recheck reviewers and access when configuration changes.
2. Read the current production deployment ID, immutable URL, source SHA and tag. Unknown source identity or DB compatibility is a stop, not a reason to invent a baseline.
3. Inspect any existing production run before starting another: the shared lock includes QA waits. Resolve a waiting run with its owner; do not cancel an ambiguous promote/rollback or bypass approval for an urgent repair.

## Normal release

1. Inspect `changeset-release/main`, title `release: update versions`, its bot identity and latest required checks. Main pushes with pending changesets prepare it automatically when release automation is enabled. Without a new push, use `gh workflow run changesets.yml --ref main`; this prepares versions only, not release authorization.
2. Inspect `pnpm changeset status` and the latest version PR. The developer merges or explicitly authorizes the Agent to merge it; that merge fixes the release source SHA. Later main commits do not replace this candidate. There is no scheduled automatic merge.
3. Actions stage the production-config deployment. Check the immutable candidate URL, deployment ID and SHA printed in Actions Summary. The developer verifies home, Google sign-in/session and read-only team access, plus the changed flow, then approves `production-release-review` with the bound DB compatibility evidence required by WORKFLOW.md. Deployment protection or OAuth callback failures must be resolved on that candidate, not bypassed using the old production site.

If a controller-only correction is merged after a failed normal release, dispatch `production-release.yml` from `main` as the configured release owner: set `mode=normal-retry`, `pull_request` to the original merged version PR number and `sha` to its full merge SHA. Use the fresh run's candidate and approvals; do not rerun the old controller or bump the app version just to retry deployment. Existing hotfix dispatches use `mode=hotfix` (the default). 4. Actions recheck the baseline under the lock, promote and run public smoke. The developer completes authenticated production QA at the next protected gate. Until safe automated sessions are delivered, HTTP success or green CI cannot replace these checks. 5. Verify the final deployment/source SHA, exact-SHA tag and GitHub Release. Failed or pending QA is not release success. Record the run evidence on the operational issue.

## Dependency maintenance

Follow [maintenance-policy.md](maintenance-policy.md) for schedules, allowlist admission and Agent collaboration. Treat graph coverage, alert visibility, native updater compatibility and exact-head auto-merge as separate proofs; local SBOM generation or upload success alone is insufficient. Keep the relevant automation flag false when its proof fails or is unavailable. New workspaces require submission mapping and graph read-back.

## Hotfix and recovery

1. Use `hotfix/*` from the verified deployed tag/SHA and prepare the isolated patch version/changelog. Complete independent Agent review and inspect the latest trusted checks. The configured release owner dispatches `production-release.yml` on `main` with `pull_request` and `sha` set to the PR number and its exact reviewed head SHA. Inspect the authorization record in the run log; a changed head requires fresh review, checks and dispatch. Apply the same candidate and production QA as normal release; dispatch is not a substitute for review. The owner may approve these protected QA jobs without a second account.
2. After publication, the developer starts an Agent first for merge-back. Read the accepted run, deployment and tag before retrying; use the generated PR when available. Preserve the repair parent, unpublished main work and pending changesets, with fresh checks and explicit merge authorization. Follow WORKFLOW.md's synchronization steps; do not rebase shared history or republish to resolve a merge conflict.
3. For failed checks or unknown metadata, leave the formal deployment unchanged and record the failure. Rollback requires the accepted artifact's exact current-DB compatibility evidence, then health verification; unknown compatibility means stop and notify, never reverse data.
