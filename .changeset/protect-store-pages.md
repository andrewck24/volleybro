---
"volleybro": patch
---

### Changed

#### Infrastructure

- `pnpm blueprint:changes:pull --force` refuses to overwrite a Change page with unpublished edits unless that page is named, as `--force <slug>`
- Republishing a Change page converted from an earlier format keeps its original facts instead of recomputing them
