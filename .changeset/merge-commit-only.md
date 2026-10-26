---
"volleybro": patch
---

### Changed

#### Infrastructure

- Every pull request to `main`, including a single-commit Fast-path change, merges with a merge commit; squash merging is no longer used, so merged branches stay ancestors of `main` and commits keep their trailers.
