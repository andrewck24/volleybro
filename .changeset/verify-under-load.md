---
"volleybro": patch
---

### Fixed

#### Infrastructure

- `pnpm verify` and `pnpm verify:all` no longer time out component tests on a busy machine
- A Change with no commit yet keeps its first publish as its start on its second publish, instead of restarting it
