## Problem

The dev branch has **20 failing test suites** and **~180 lint errors/warnings** that must be resolved before merging to main. These issues were introduced across 4 feature PRs (#267–#276) during dev-branch development.

## Root Cause

Two independent root causes:

1. **InversifyJS v8 is ESM-only**: `inversify@8.1.0` and its dependencies (`@inversifyjs/core`, `@inversifyjs/container`) ship as `"type": "module"`. Jest (via next/jest) uses CommonJS transform and cannot parse the ESM `export` syntax, causing all 20 test suites that import inversify decorators to fail.

2. **Accumulated lint violations**: Production code and test infrastructure (`jest.setup.ts`) contain `no-explicit-any` errors, `react-hooks/refs` violations, unused variable warnings, and miscellaneous config issues.

## Proposed Solution

### Fix 1: Jest ESM transform

Add `transformIgnorePatterns` to `jest.config.ts` so Jest transforms inversify and its `@inversifyjs/*` dependencies instead of skipping them.

### Fix 2: ReduxProvider ref access

Replace the `useRef` pattern in `ReduxProvider` with a module-level lazy singleton to satisfy the `react-hooks/refs` lint rule. Safe because the component is `"use client"` only.

### Fix 3: Production code `no-explicit-any`

Replace `any` with proper types in 3 production files:
- `src/applications/repositories/base.repository.interface.ts`
- `src/applications/usecases/player/update-player-info.usecase.ts`
- `src/components/custom/court/index.tsx`

### Fix 4: `jest.setup.ts` type improvements

Refactor motion mock helpers to eliminate duplicate `filterMotionProps` definitions, replace `any` with proper types (`Record<string, unknown>`, specific interfaces), and prefix unused destructured variables with `_`.

### Fix 5: Remaining config-level lint issues

- `postcss.config.mjs` — fix anonymous default export
- `openspec/changes/archive/` — exclude from eslint via config (not per-file disable)
- Storybook config — exclude from testing-library rule

## Success Criteria

- `npm test` — all test suites pass
- `npm run build` — succeeds
- `npm run lint` — 0 errors and 0 warnings in production code and test infrastructure (test file `no-explicit-any` errors are acceptable and deferred to a separate change)

## Impact

- Affected code:
  - `jest.config.ts`
  - `jest.setup.ts`
  - `src/lib/redux/provider.tsx`
  - `src/applications/repositories/base.repository.interface.ts`
  - `src/applications/usecases/player/update-player-info.usecase.ts`
  - `src/components/custom/court/index.tsx`
  - `postcss.config.mjs`
  - ESLint config (`.eslintrc` or equivalent)
