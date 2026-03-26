## Why

The project currently uses TypeScript 5.9.3. TypeScript 6.0 is the bridge release to the native Go-based TypeScript 7.0, and deprecates many options that TS7 removes entirely. Upgrading to 6.0.2 now and aligning `tsconfig.json` settings with TS7 defaults ensures the future TS7 migration is near-painless. Additionally, enabling `strict: true` catches ~233 type-safety issues across 73 files that currently go undetected.

## What Changes

- Upgrade `typescript` from `^5.9.3` to `6.0.2` in `package.json`
- Enable `strict: true` in `tsconfig.json` and fix all ~233 resulting type errors across 73 files
- Update `target` from `ES2017` to `es2025` (TS6 default; no runtime impact since `noEmit: true`)
- Remove `dom.iterable` from `lib` array (now included in `dom` as of TS6)
- Add `noUncheckedSideEffectImports: true` (TS6 default)
- Verify `types` array is explicit (already set to `["node", "@serwist/next/typings", "reflect-metadata"]`)
- Keep `experimentalDecorators` and `emitDecoratorMetadata` (required by InversifyJS across 25 files) with TODO comment for future TS7 migration
- Verify toolchain compatibility: `typescript-eslint`, `ts-jest`, `eslint-config-next`, and Storybook packages with TS 6.0

## Non-Goals

- **ESLint major upgrade**: ESLint 10 or typescript-eslint major version changes are out of scope
- **Removing `experimentalDecorators`**: InversifyJS requires decorator metadata across 25 files; removing would require rewriting all DI bindings to manual factory pattern — deferred to a separate change if/when TS7 drops support
- **TypeScript 7.0 migration**: This change only aligns settings so TS7 migration is near-painless; the actual TS7 upgrade is a future change
- **Adding `ignoreDeprecations: "6.0"`**: The goal is to fully address deprecations, not suppress them

## Capabilities

### New Capabilities

(none — this is a toolchain upgrade with no new business capabilities)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - `package.json` (typescript version bump, possible @types updates)
  - `tsconfig.json` (strict, target, lib, noUncheckedSideEffectImports)
  - ~73 source files requiring strict mode fixes (primarily in `src/components/record/`, `src/applications/usecases/record/`, `src/infrastructure/db/repositories/`, `src/lib/features/record/`)
  - `jest.config.ts` (verify compatibility)
  - `eslint.config.mjs` (verify compatibility)
- Dependencies: none (this change can run independently of other in-progress changes)
