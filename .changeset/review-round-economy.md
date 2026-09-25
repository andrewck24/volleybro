---
"volleybro": patch
---

### Changed

#### Infrastructure

- After the first Pre-PR review round, each round reviews only the commits since the last reviewed one, with how earlier findings were handled; the round after an approach switch reviews the whole diff again
- A root cause found in two review rounds in a row switches the approach instead of patching cases
