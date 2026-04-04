## 1. pnpm Installation

- [x] 1.1 Delete `package-lock.json` from the repo
- [x] 1.2 Run `pnpm import` to generate `pnpm-lock.yaml` from the deleted lock file (uses npm registry metadata)
- [x] 1.3 Run `pnpm install` and confirm no resolution errors
- [x] 1.4 Create `.npmrc` at repo root with `shamefully-hoist=true` (decision: Use `shamefully-hoist=true` in `.npmrc`)
- [x] 1.5 Run `pnpm build` to verify all dependencies resolve correctly under pnpm's node_modules layout; fix any resolution failures before proceeding
- [x] 1.6 Commit: `chore(deps): migrate package manager to pnpm`

## 2. Package.json and Lockfile Config

- [x] 2.1 Add `"packageManager": "pnpm@10.15.1"` field to `package.json` (decision: `pnpm/action-setup@v4` reads `packageManager` field)
- [x] 2.2 [P] Remove all `@semantic-release/*` devDependencies from `package.json` and run `pnpm install`
- [x] 2.3 [P] Add `@changesets/cli` as a devDependency: `pnpm add -D @changesets/cli`
- [x] 2.4 Run `pnpm changeset init` to generate `.changeset/config.json`
- [x] 2.5 Add `package-lock.json` to `.gitignore` to prevent accidental npm usage from reintroducing it
- [x] 2.6 Commit: `chore(deps): replace semantic-release with changesets`

## 3. Remove semantic-release Artifacts

- [x] 3.1 Delete `release.config.ts` (decision: Delete `release.config.ts` entirely)
- [x] 3.2 Delete `.github/workflows/release.yml` — do not rename/edit; the structure is fundamentally different from changesets (decision: Replace `release.yml` with `changesets.yml` (not rename/edit))
- [x] 3.3 Commit: `chore(ci): remove semantic-release config and workflow`

## 4. Create changesets Workflow

- [x] 4.1 Create `.github/workflows/changesets.yml` with the following structure (decision: Replace `release.yml` with `changesets.yml`; decision: `changesets/action@v1` without `publish` input):
  - Trigger: `push` to `main`
  - `permissions: contents: write, pull-requests: write`
  - Steps: `actions/checkout@v4` → `pnpm/action-setup@v4` (no version, reads `packageManager`) → `actions/setup-node@v4` with `node-version: 20, cache: 'pnpm'` → `pnpm install --frozen-lockfile` → `changesets/action@v1` with `commit: "chore: update versions"`, `title: "chore: update versions"`, `createGithubReleases: true`; env: `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`
- [x] 4.2 [P] Update `.github/workflows/chromatic.yml`:
  - Add `uses: pnpm/action-setup@v4` step before `actions/setup-node@v4`
  - Change `cache: "npm"` → `cache: "pnpm"` in the setup-node step
  - Change `run: npm ci` → `run: pnpm install --frozen-lockfile`
- [x] 4.3 Commit: `chore(ci): replace release workflow with changesets, update chromatic to pnpm`

## 5. Documentation and Config Sync

- [x] 5.1 [P] Update `openspec/config.yaml`: change `Package manager: npm` (line 7) → `Package manager: pnpm`, and change `npm run test, npm run lint, npx tsc -noEmit, npm run build` (line 61) → `pnpm test, pnpm lint, pnpm exec tsc --noEmit, pnpm build`
- [x] 5.2 [P] Update `README.md`: replace all `npm install` / `npm run` references with pnpm equivalents
- [x] 5.3 [P] Update `CONTRIBUTING.md`: replace npm command references with pnpm; add a note that contributors must run `pnpm changeset` when submitting PRs that need a version bump
- [x] 5.4 [P] Update `docs/maintenance-policy.md`: replace npm command references with pnpm
- [x] 5.5 [P] Update `AGENTS.md`: replace npm command references with pnpm
- [x] 5.6 Commit: `docs: update npm references to pnpm across docs and config`

## 6. Verification

- [x] 6.1 Run `pnpm test` — confirm all tests pass
- [x] 6.2 Run `pnpm lint` — confirm no lint errors
- [x] 6.3 Run `pnpm exec tsc --noEmit` — confirm no type errors
- [x] 6.4 Run `pnpm build` — confirm production build succeeds
- [x] 6.5 Run `pnpm build-storybook` — confirm Storybook build succeeds under pnpm

## 7. First Version Bump with changesets

- [x] 7.1 Run `pnpm changeset` interactively: select patch bump, write summary "Migrate package manager from npm to pnpm and replace semantic-release with changesets"
- [x] 7.2 Commit the generated `.changeset/*.md` file: `chore: add changeset for pnpm migration`
- [ ] 7.3 Run `pnpm changeset version` to apply the version bump (expected: patch → v0.12.1) and update `docs/CHANGELOG.md`
- [ ] 7.4 Run `pnpm install` to update `pnpm-lock.yaml` after version bump
- [ ] 7.5 Commit: `chore: release v0.12.1`
