---
"volleybro": patch
---

### Changed

#### Infrastructure

- Changes first written as two pages are now single pages with Proposal and Review tabs
- Republishing a merged Change measures it by the commit that landed it on `dev` and records `mergedAt`

#### CI

- A push to the Change-page store triggers a Blueprint production deploy

### Removed

#### Infrastructure

- The `/proposal` and `/review` URLs of the converted Changes

### Fixed

#### Infrastructure

- Single-page Changes now appear in the Changes index
- The Change page header says "1 commit" rather than "1 commits"
