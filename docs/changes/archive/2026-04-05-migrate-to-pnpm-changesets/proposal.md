## Why

The project currently uses npm as the package manager and semantic-release for automated versioning. Migrating to pnpm reduces install times and prepares the toolchain for an upcoming monorepo migration. Replacing semantic-release with changesets provides explicit, intent-based version control that works natively in both single-package and monorepo setups.

## What Changes

- Replace `package-lock.json` with `pnpm-lock.yaml` (`pnpm import` then `pnpm install`)
- Add `packageManager: "pnpm@10.15.1"` to `package.json`
- Add `.npmrc` with `shamefully-hoist=true` to ensure Next.js ecosystem compatibility
- Add `package-lock.json` to `.gitignore`
- Remove `semantic-release` and all `@semantic-release/*` plugins from devDependencies
- Add `@changesets/cli` to devDependencies
- Delete `release.config.ts`
- Replace `.github/workflows/release.yml` with `.github/workflows/changesets.yml` (using `changesets/action@v1`)
- Update `.github/workflows/chromatic.yml` to use pnpm setup and cache
- Update `openspec/config.yaml` (2 occurrences of `npm`)
- Update all documentation files that reference `npm` commands: `README.md`, `CONTRIBUTING.md`, `docs/maintenance-policy.md`, `AGENTS.md`

## Non-Goals

- Monorepo structural migration (moving code into `packages/`, workspace package splitting) — this is a separate change
- Adding `pnpm publish` or npm registry publishing — the repo is `private: true`

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none — this change affects toolchain and workflow only, not application behavior or spec-level requirements)

## Impact

- **Deleted files**: `release.config.ts`, `.github/workflows/release.yml`, `package-lock.json`
- **New files**: `pnpm-lock.yaml`, `.npmrc`, `.github/workflows/changesets.yml`
- **Modified files**:
  - `package.json` — `packageManager` field, devDependency changes
  - `.gitignore` — add `package-lock.json`
  - `.github/workflows/chromatic.yml` — pnpm setup + cache
  - `openspec/config.yaml` — 2 occurrences of npm references
  - `README.md`, `CONTRIBUTING.md`, `docs/maintenance-policy.md`, `AGENTS.md` — npm → pnpm command references
