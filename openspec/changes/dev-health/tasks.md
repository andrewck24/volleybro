## 1. Jest transform for ESM-only packages

- [ ] [P] 1.1 Add `transformIgnorePatterns` to `jest.config.ts` to transform inversify and @inversifyjs packages
- [ ] 1.2 Run `npm test` and verify all 20 previously failing test suites pass

## 2. ReduxProvider store initialization

- [ ] [P] 2.1 Replace `useRef` pattern with module-level lazy singleton in `src/lib/redux/provider.tsx`
- [ ] 2.2 Run `npm run lint -- src/lib/redux/provider.tsx` and verify 0 errors

## 3. Production code `no-explicit-any` fixes

- [ ] [P] 3.1 Replace `any` with proper types in `src/applications/repositories/base.repository.interface.ts`
- [ ] [P] 3.2 Replace `any` with proper types in `src/applications/usecases/player/update-player-info.usecase.ts`
- [ ] [P] 3.3 Replace `any` with proper types in `src/components/custom/court/index.tsx`

## 4. Motion mock refactoring in jest.setup.ts

- [ ] 4.1 Extract shared `filterMotionProps` with proper typing, deduplicate across motion/react and motion/react-m mocks
- [ ] 4.2 Replace all `any` types with `Record<string, unknown>` or specific interfaces
- [ ] 4.3 Prefix unused destructured variables with `_` (motion props and Image props)
- [ ] 4.4 Fix `console.error` args type from `any[]` to `unknown[]`
- [ ] 4.5 Run `npx eslint jest.setup.ts` and verify 0 errors and 0 warnings

## 5. Archive directory lint exclusion and config fixes

- [ ] [P] 5.1 Add `openspec/changes/archive/` to ESLint ignore patterns in config
- [ ] [P] 5.2 Fix `postcss.config.mjs` anonymous default export warning
- [ ] [P] 5.3 Fix Storybook testing-library rule configuration

## 6. Final verification

- [ ] 6.1 Run `npm test` — all suites pass
- [ ] 6.2 Run `npm run lint` — 0 errors in production code and test infrastructure
- [ ] 6.3 Run `npm run build` — succeeds
