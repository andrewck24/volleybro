---
"volleybro": patch
---

### Changed

#### Infrastructure

- The Blueprint Changes sidebar and the previous/next links follow the Changes index order, newest first by `archivedAt` and then `startedAt` (ADR-0078)

### Removed

#### Infrastructure

- `check:workflow` no longer checks two-page Change pages, which no longer exist

### Fixed

#### Infrastructure

- The Blueprint Changes sidebar lists each Change as a plain page, with no empty expand chevron
