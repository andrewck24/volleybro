# Maintenance Policy

This document defines how to keep VolleyBro's dependencies and test infrastructure healthy over time. Follow these rules when upgrading any package.

See also: [Testing Strategy](./testing-strategy.md) · [Architecture Overview](./architecture.md) · [Contributing Guide](../CONTRIBUTING.md)

---

## Major Version Bumps

When upgrading any package to a new major version:

1. Create a **dedicated branch** (e.g., `chore/upgrade-jest-30`) — do not mix upgrade work with feature work
2. Read the package's official **migration guide** and apply all required changes
3. Run the full test suite and fix all failures before merging
4. Update any affected setup files (`jest.setup.backend.ts`, `jest.setup.frontend.ts`, config files) if the upgrade changes their API
5. Verify the production build still succeeds (`pnpm build`)
6. Get a second review on the diff — major upgrades are high blast-radius

**Verification checklist before merging a major upgrade PR:**

- `pnpm test` — all tests pass
- `pnpm typecheck` — no TypeScript errors
- `pnpm lint` — no lint errors
- `pnpm build` — production build succeeds
- Migration guide steps completed and noted in the PR description

---

## Constraints an Upgrade Adds to Existing Data

A dependency that owns a schema can introduce a **constraint** in a minor version, and apply it to data written long before it existed. Better Auth 1.7 added a unique index over `(issuer, accountId)` on the accounts collection; its Mongo adapter creates that index **lazily, on the first write** rather than at install time. Records from the previous auth library carried neither indexed field, so every one of them presented the key `(null, null)`, the index could never build, and the failure was returned to whichever write happened to trigger it. Nobody could sign in — including users whose own records were entirely current.

Two things make this class of failure hard to read:

- **The reported error names the caller's domain, not the cause.** Better Auth caught the index failure and reported `unable_to_link_account`. Reading that at face value sends you looking at account linking, which is working correctly. The server log carried the real error; the client only ever saw the symptom.
- **Nothing fails at upgrade time.** The install succeeds, the build succeeds, the test suite passes — every test runs against a fresh database, where no legacy record exists. The failure needs production-shaped data, so it appears first in whichever environment has the oldest data.

Before upgrading a package that owns a schema:

1. Read the changelog for **new indexes and constraints**, not only for API changes.
2. Check existing data against each one before deploying. A unique index over fields that older records lack is the common case: they all collapse to the same key.
3. Assume constraints are applied lazily unless the adapter documents otherwise — a clean install proves nothing about a database with history in it.

When existing data has to be reconciled, the migration is a script under `scripts/migrations/`, and:

- it is a **dry run by default**, with `--apply` to write;
- it **converts rather than deletes** wherever a record still belongs to someone — deleting eight legacy account records would have been one line and would have cost seven people their sign-in;
- it **verifies afterwards** that the constraint can now hold, since a migration that leaves one collision behind has fixed nothing;
- it is **idempotent**, and its header records which environments it has been applied to. It stays in the repository until that list is complete, because until then it is a tool rather than a record.

---

## TypeScript Dual Toolchain

The repo intentionally installs two TypeScript versions (see Paca VB-51 for the convergence conditions and steps):

- `typescript` (6.x) — the JS Compiler API provider. `next build`'s type check, `typescript-eslint` (via `eslint-config-next`), and `ts-node` (loads `jest.config.ts`) all resolve this package. TS 7 removed `lib/typescript.js`, so these tools cannot use it yet.
- `tsgo` (npm alias for `typescript@7`) — the Go-native compiler that powers `pnpm typecheck`, several times faster than 6.x.

Two sharp edges this creates:

1. The `typecheck` script invokes `node node_modules/tsgo/bin/tsc` **by direct path on purpose**: the alias installs typescript 7's own `tsc` bin name, which collides with typescript 6's in `node_modules/.bin`, so `pnpm exec tsc` is ambiguous. Do not "simplify" the script to `tsc --noEmit` or `tsgo --noEmit` (no such CLI exists).
2. Avoid bare `tsc` / `pnpm exec tsc` anywhere (scripts, CI, docs) — which version wins the `.bin` collision is an implementation detail. Use `pnpm typecheck` instead.

---

## Mock Drift

Test mocks can silently diverge from the real API they represent. When a mocked dependency is upgraded:

1. Identify all mock boundaries it touches (setup files and inline mocks)
2. Compare the mock surface against the upgraded package's API — look for removed methods, changed signatures, or new required fields
3. Update mocks to match the real API before merging the upgrade
4. Run the layer-specific tests that exercise the mock boundary to confirm they still pass

**Example:** When upgrading MongoDB/Mongoose, review `jest.setup.backend.ts` and any inline repository mocks to verify all mocked methods still exist on the real driver.

**Rule:** A mock of a removed API passes silently while production code fails. Always verify mock surfaces explicitly after any dependency upgrade that touches a mocked boundary.

---

## Type Boundary Drift

When domain models change, keep type boundaries synchronized across three layers:

1. Domain entity types in `src/entities/`
2. API response schemas in `src/lib/features/*/types.ts` (`*ResponseSchema`)
3. Presentation view types inferred from schemas (`*View`)

Follow this policy for every domain type update:

1. Update domain entities first (`id`, enums, field names, optionality)
2. Update corresponding Zod response schemas to reflect actual controller response shape
3. Regenerate inferred view types (`z.infer`) and migrate presentation usage to `*View`
4. Keep enum imports from entities value-only; do not import entity data shapes in `src/components/` or `src/lib/features/`
5. Update tests at layer boundaries to use view types and remove unnecessary casts
6. Run full verification:
   - `pnpm test`
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm build`

Review gate:

- Any PR that changes entity fields or names must include corresponding `types.ts` schema/view updates, or an explicit note explaining why no boundary update is required.
