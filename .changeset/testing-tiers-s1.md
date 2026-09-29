---
"volleybro": patch
---

### Changed

#### Infrastructure

- Integration tests run on one in-memory MongoDB replica set per run, with a database of their own for each test file, so a transaction can be proven; a full run takes about 17 seconds instead of 85
- Integration tests are split into `test/integration/api/`, which reaches the database only through routes, and `test/integration/persistence/`, which tests database behaviour itself
- Every API route has exactly one unit test file, `__tests__/route.test.ts`, which also holds its request-schema rejections
- `pnpm check:workflow` fails on a test file whose suffix does not match its tier's directory
- `pnpm verify` no longer runs the workflow tests; `pnpm verify:all` runs them, and the integration tests, only when the diff reaches them, and no longer builds the Blueprint site
- Jest setup files moved under `test/setup/`
