## Context

The dev branch accumulated 20 failing test suites and ~180 lint errors/warnings across 4 feature PRs. The failures block merging dev into main. All test failures share a single root cause (InversifyJS v8 ESM incompatibility with Jest's CJS transform). Lint issues span production code, test infrastructure, and config files.

## Goals / Non-Goals

**Goals:**

- All test suites pass (`npm test`)
- Production code and test infrastructure lint-clean (`npm run lint`)
- Build succeeds (`npm run build`)

**Non-Goals:**

- Fixing `no-explicit-any` in test files (deferred to a separate change)
- Fixing `testing-library/no-container` and `no-node-access` in test files (deferred)
- Migrating to InversifyJS v8 new APIs (`@binding`, `BindingModule`) — current usage of `@injectable`/`@inject`/`container.bind().to()` is fully compatible with v8

## Decisions

### Jest transform for ESM-only packages

Add `transformIgnorePatterns: ["/node_modules/(?!(inversify|@inversifyjs)/)"]` to `jest.config.ts`. This tells Jest to transform `inversify`, `@inversifyjs/core`, and `@inversifyjs/container` (all ESM-only) through its SWC/Babel pipeline instead of skipping them.

**Alternative**: Using `--experimental-vm-modules` for native ESM in Jest — rejected because it requires significant test infrastructure changes and is still experimental.

### ReduxProvider store initialization

Replace `useRef` pattern with module-level lazy singleton:

```ts
let store: AppStore | undefined;
function getStore() {
  if (!store) store = makeStore();
  return store;
}
```

**Rationale**: React 19's `react-hooks/refs` rule flags `storeRef.current` access during render. The `"use client"` directive ensures this component only runs on the client side, making a module-level singleton safe (no SSR request-to-request state leakage).

**Alternative**: `useMemo(() => makeStore(), [])` — rejected because React docs explicitly warn that `useMemo` is not guaranteed to preserve the value across re-renders.

### Motion mock refactoring in jest.setup.ts

Extract a shared `filterMotionProps` function with proper typing (`Record<string, unknown>`) instead of duplicating it in two mock blocks with `any` types. Prefix unused destructured variables with `_` to satisfy `no-unused-vars`.

### Archive directory lint exclusion

Add `openspec/changes/archive/` to ESLint's `ignorePatterns` in the config file rather than adding per-file `eslint-disable` comments. Archived code is frozen and linting it provides no value.

## Risks / Trade-offs

- [ReduxProvider singleton] Store persists across hot reloads in development → No issue: Next.js fast refresh preserves module state anyway, matching current `useRef` behavior.
- [transformIgnorePatterns] Future ESM-only dependencies may need to be added to the pattern → Low risk: the pattern is extensible and well-documented.
