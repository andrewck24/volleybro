---
"volleybro": patch
---

### Changed

#### Infrastructure

- `pnpm verify` and `pnpm verify:all` run their checks as concurrent lanes; `verify:all` skips lanes whose inputs the branch did not touch, and `--full` runs everything
