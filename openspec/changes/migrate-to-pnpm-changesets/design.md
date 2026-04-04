## Context

The project uses npm as its package manager with `package-lock.json` for dependency locking, and semantic-release for automated versioning triggered on push to `main`. The migration replaces both tools: pnpm for package management and changesets for versioning.

This change is a prerequisite for a future monorepo migration. changesets is chosen over semantic-release because it supports explicit, per-PR version intent rather than inferring from commit messages, and it works natively in both single-package and monorepo setups.

## Goals / Non-Goals

**Goals:**

- Replace npm with pnpm as the package manager (lockfile, scripts, CI cache)
- Replace semantic-release with changesets for versioning and GitHub releases
- Update all GitHub Actions workflows to use pnpm
- Sync all documentation and config that references npm

**Non-Goals:**

- Monorepo structural migration (packages/, workspace splitting)
- npm registry publishing (repo is `private: true`)
- Changing the versioning semantics (patch/minor/major still apply)

## Decisions

### Use `shamefully-hoist=true` in `.npmrc`

pnpm uses a strict node_modules layout by default (no hoisting). The Next.js ecosystem — particularly `@serwist/next`, Storybook-related packages, and some Radix UI internals — relies on hoisted resolution behavior. Setting `shamefully-hoist=true` replicates npm's flat layout and avoids runtime or build failures without requiring per-package `public-hoist-pattern` entries.

Alternative considered: `public-hoist-pattern[]=*` (equivalent but more verbose) — rejected in favor of the simpler flag.

### Delete `release.config.ts` entirely

The entire semantic-release plugin chain (`@semantic-release/commit-analyzer`, `@semantic-release/git`, `@semantic-release/npm`, `@semantic-release/changelog`) is replaced by changesets. There is no partial reuse path. The file is deleted and all `@semantic-release/*` devDependencies are removed.

### Replace `release.yml` with `changesets.yml` (not rename/edit)

The existing `release.yml` structure (single-job, push-to-main, run semantic-release) is fundamentally different from the changesets workflow pattern. Editing in place would produce a misleading diff and leave dead configuration. A new `changesets.yml` is created; `release.yml` is deleted.

### `changesets/action@v1` without `publish` input

Since `package.json` is `private: true`, no npm publishing is needed. The action is configured with only `createGithubReleases: true` to preserve GitHub Release creation and git tagging. `NPM_TOKEN` and `ci:publish` script are omitted.

### `pnpm/action-setup@v4` reads `packageManager` field

The `packageManager: "pnpm@10.15.1"` field in `package.json` eliminates the need for a hardcoded `version` input in the workflow. This keeps the pnpm version as a single source of truth.

### Changeset body as CHANGELOG entry

The changesets default formatter produces `### Patch Changes` groupings unsuitable for human-readable changelogs. A custom changelog formatter is implemented that reads the changeset body verbatim and wraps it with a version header, ISO date, and GitHub compare link.

This means the `.changeset/*.md` body IS the changelog draft. Authors must write it in Keep-a-Changelog format (`### Added / Changed / Fixed / ...` with optional `####` domain sub-headings). Implementation details, internal refactors, test additions, and dep upgrades with no user-visible effect are omitted.

The `writing-changelog` skill (`.claude/skills/writing-changelog/SKILL.md`) documents the authoring process, enforces correct type names, and provides a rationalization table for common omission mistakes.

## Risks / Trade-offs

- **pnpm hoist behavior** → `shamefully-hoist=true` resolves known compatibility issues, but less common packages may still require build validation after migration. Mitigation: run full build + Storybook build as part of verification.
- **changesets requires a manual step per PR** → Developers must run `pnpm changeset` before merging changes that need a version bump. If omitted, no version PR is opened. Mitigation: document in `CONTRIBUTING.md`.
- **`persist-credentials: false` removed** → The current `release.yml` uses this for security; `changesets/action` requires default credentials to open PRs. This is an accepted trade-off — the action is an official, widely-used GitHub Action.
- **`fetch-depth: 0` no longer needed** → semantic-release required full git history to analyze all commits. changesets reads changeset files only. Removing `fetch-depth: 0` speeds up checkout.

## Migration Plan

1. Delete `package-lock.json`, run `pnpm import` to generate `pnpm-lock.yaml` from existing lock
2. Run `pnpm install` to verify resolution
3. Run full build (`pnpm build`) to verify `shamefully-hoist` resolves all dependencies
4. Update `package.json`: add `packageManager`, remove semantic-release devDeps, add `@changesets/cli`
5. Run `pnpm changeset init` to generate `.changeset/config.json`
6. Delete `release.config.ts`
7. Delete `.github/workflows/release.yml`, create `.github/workflows/changesets.yml`
8. Update `.github/workflows/chromatic.yml`
9. Update `.gitignore`, `openspec/config.yaml`, and documentation files
10. Verify CI on a test branch push

Rollback: restore `package-lock.json` from git history, reinstate `release.yml`, revert `package.json` devDependencies.
