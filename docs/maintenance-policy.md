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
- `pnpm exec tsc --noEmit` — no TypeScript errors
- `pnpm lint` — no lint errors
- `pnpm build` — production build succeeds
- Migration guide steps completed and noted in the PR description

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
