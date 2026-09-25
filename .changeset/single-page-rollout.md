---
"volleybro": patch
---

### Changed

#### Infrastructure

- Every Blueprint Change is one page with Proposal and Review tabs; the Changes first written as two pages have been converted and their `/proposal` and `/review` URLs removed
- Republishing a merged Change measures it by the commit that landed it on `dev` and records `mergedAt`
- A push to the Change-page store triggers a Blueprint production deploy

### Fixed

#### Infrastructure

- Single-page Changes now appear in the Changes index
