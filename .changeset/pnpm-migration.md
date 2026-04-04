---
"volleybro": patch
---

### Changed

#### Infrastructure

- Migrate package manager from npm to pnpm (`pnpm@10.33.0`); use `pnpm install` to set up dependencies
- Replace semantic-release with changesets for version management; run `pnpm changeset` before submitting PRs with user-visible changes
