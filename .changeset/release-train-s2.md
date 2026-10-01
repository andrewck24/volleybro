---
"volleybro": minor
---

### Added

- Add a guarded production release workflow that selects a fixed revision through the version PR, requires candidate QA and production smoke, and records a release only after success.

### Changed

- Prepare main-based integration with a separate test URL so daily merges no longer automatically deploy production after cutover.
