## 1. Jest Projects Configuration for Environment Isolation

- [x] [P] 1.1 Split setup files by environment — create `jest.setup.backend.ts` with DB-only mocks (mongodb, mongoose, bson, fetch, console suppression) extracted from current `jest.setup.ts`
- [x] [P] 1.2 Split setup files by environment — create `jest.setup.frontend.ts` with browser/React mocks (@testing-library/jest-dom, jest-axe, IntersectionObserver, ResizeObserver, matchMedia, next/link, next/image, motion/react, motion/react-m, fetch, console suppression) extracted from current `jest.setup.ts`
- [x] 1.3 Rewrite `jest.config.ts` to use Jest `projects` array with two sub-projects: `backend` (node env, matches entities/applications/infrastructure/interface/app/api) and `frontend` (jsdom env, matches components/lib). Apply split setup files per project.
- [x] 1.4 Remove original `jest.setup.ts` after migration
- [x] 1.5 Run `npm test`, `npm run lint`, `npm run build` — verify all 67 tests pass with new config

## 2. Mock Factory Functions for Repository Interfaces and Auth Services

- [x] [P] 2.1 Create `src/__tests__/helpers/mock-repositories.ts` with `createMockPlayerRepository()`, `createMockTeamRepository()`, `createMockRecordRepository()`, `createMockUserRepository()` — typed as `jest.Mocked<I*Repository>`
- [x] [P] 2.2 Create mock factory functions for auth services: `createMockAuthenticationService()`, `createMockAuthorizationService()` in `src/__tests__/helpers/mock-services.ts`
- [x] [P] 2.3 Create `src/__tests__/helpers/index.ts` re-exporting all factories
- [x] 2.4 Run `npm test`, `npm run lint`, `npm run build` — verify new helpers compile and export correctly

## 3. Fixture Factory Functions for Test Entities

- [x] 3.1 Create `src/__tests__/helpers/fixtures.ts` with `createPlayer()`, `createTeam()`, `createRecord()`, `createUser()` fixture factories accepting `Partial<T>` overrides
- [x] 3.2 Run `npm test`, `npm run lint`, `npm run build` — verify fixture factories compile

## 4. Migrate UseCase Tests (Application Layer — Classical Style)

- [x] [P] 4.1 Migrate player usecase tests (13 files in `src/applications/usecases/player/__tests__/`): replace inline repository/service mocks with factories, replace inline entity data with fixture factories, remove `toHaveBeenCalledWith` behavior assertions — keep only state verification
- [x] [P] 4.2 Migrate record usecase tests (`src/applications/usecases/record/__tests__/record-errors.test.ts`): adopt mock factories and fixture factories, remove behavior assertions
- [x] [P] 4.3 Migrate team usecase tests (`src/applications/usecases/team/__tests__/`): adopt mock factories and fixture factories, remove behavior assertions
- [x] [P] 4.4 Migrate user usecase tests (3 files in `src/applications/usecases/user/__tests__/`): adopt mock factories and fixture factories, remove behavior assertions
- [x] 4.5 Run `npm test`, `npm run lint`, `npm run build` — verify all usecase tests pass with layer-based testing strategy applied

## 5. Migrate Infrastructure and API Route Tests

- [x] [P] 5.1 Consolidate infrastructure test directories — merge `src/infrastructure/db/repositories/tests/__tests__/*.test.ts` into `src/infrastructure/db/repositories/__tests__/` and update imports
- [x] [P] 5.2 Move `src/infrastructure/db/repositories/tests/helpers/` utilities (`createMockDocument`, `setupModelMocks`) into `src/__tests__/helpers/`, fix `no-explicit-any` lint errors in the moved helpers, update all imports, and remove empty `tests/` directory
- [x] [P] 5.3 Migrate infrastructure tests (files in `src/infrastructure/`): adopt mock factories and fixture factories where applicable
- [x] [P] 5.4 Migrate API route tests (files in `src/app/api/`): adopt mock factories and fixture factories where applicable
- [x] 5.5 Unskip `record.repository.test.ts`, `team.repository.test.ts`, `user.repository.test.ts` (remove `describe.skip`) and fix complex mocking issues — replaced auto-mock + setupModelMocks with manual mock factories
- [x] 5.6 Run `npm test`, `npm run lint`, `npm run build` — verify all infrastructure and API route tests pass

## 6. Migrate Component and Lib Tests (Frontend)

- [x] [P] 6.1 Migrate component tests (4 files in `src/components/team/__tests__/`): replaced inline Player objects with `createPlayer()`, fixed `position: string` → `Position` enum type errors
- [x] [P] 6.2 Migrate lib tests (2 files: `player.test.ts`, `auth-hook.test.ts`): adopted `createPlayer()` and `createProfile()` fixture factories
- [x] 6.3 Run `npm test`, `npm run lint`, `npm run build` — verify all frontend tests pass

## 7. Final Verification (Phase 1)

- [x] 7.1 Run full `npm test` — 61 suites, 587 tests, 0 skipped (up from 58 suites, 551 tests, 36 skipped)
- [x] 7.2 Run `npm run lint` and `npm run build` — build passes, lint has 89 pre-existing errors only
- [x] 7.3 Verify no remaining `as any` casts in mock definitions that are now covered by factories — remaining `as any` are intentional (error-path tests, API error codes)

## 8. Source File Quick Fixes + FilterQuery Upgrade (Infrastructure/Application/Presentation layers)

- [x] [P] 8.1 Upgrade `src/infrastructure/db/repositories/base.repository.mongo.ts`: import `FilterQuery` from `mongoose`, replace `Record<string, any>` → `FilterQuery<M>` on `find`, `findOne`, `update`, `delete` params; fix `data as any` on line 94
- [x] [P] 8.2 Fix `src/applications/repositories/record.repository.interface.ts`: `{ [key: string]: any }` → `Record<string, unknown>` in `findMatchesWithPagination` filter param
- [x] [P] 8.3 Fix `src/infrastructure/db/repositories/record.repository.mongo.ts:19`: `{ [key: string]: any }` → `Record<string, unknown>` to match interface
- [x] [P] 8.4 Fix `src/lib/data/mongodb.ts:27`: `let` → `const` (never reassigned)
- [x] [P] 8.5 Bug fix `src/components/ui/calendar.tsx:213`: add missing `onNextClick={onNextClick}` to `<Nav>` props
- [x] [P] 8.6 Fix `src/components/ui/use-toast.ts:18`: prefix unused `actionTypes` → `_actionTypes`
- [x] [P] 8.7 Fix `src/lib/features/record/record-slice.ts:212`: `substitution` → `_substitution` (intentional omit pattern)
- [x] [P] 8.8 Fix `src/components/layout/nav/links.tsx`: unused `session` → `_session`
- [x] [P] 8.9 Fix `src/lib/hooks/usePullToRefresh.ts:26`: `() => {} | void` → `() => void`
- [x] [P] 8.10 Fix `src/components/record/panel/moves/oppo.tsx`: ternary unused expression → `if/else`
- [x] 8.11 Run `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` — verify all pass

## 9. Delete Unused Code + `set-state-in-effect` Fixes (Presentation layer)

- [x] [P] 9.1 Delete unused `src/components/ui/drawer.tsx` and `src/lib/hooks/useMediaQuery.ts`, remove any barrel re-exports; also uninstall `vaul` package (only used by drawer)
- [x] [P] 9.2 Create `src/lib/hooks/useHydrated.ts` using `useSyncExternalStore` (server returns `false`, client returns `true`)
- [x] [P] 9.3 Replace `mounted` state + `useEffect` → `useHydrated()` in `src/components/ui/flip-words.tsx` (both components)
- [x] [P] 9.4 Replace `mounted` state + `useEffect` → `useHydrated()` in `src/components/landing/features/index.tsx`
- [x] [P] 9.5 Replace `mounted` state + `useEffect` → `useHydrated()` in `src/components/landing/footer/dark-mode.tsx`
- [x] 9.6 Fix `src/components/landing/cta-button.tsx`: replace `mounted` state with `useHydrated()`; platform detection remains in `useEffect` (requires browser APIs)
- [x] 9.7 Run `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` — verify all pass

## 10. Test File Fixes (Test layer)

- [x] [P] 10.1 Fix `src/lib/api/__tests__/wrappers.test.ts`: remove unused `AuthenticationError` import, fix `as jest.Mock` → `as unknown as jest.Mock`, add `return undefined as never` after `schema.parse()`
- [x] [P] 10.2 Fix component test mock `any` types (~10 files): replace `(props: any)` with typed props in `jest.mock` callbacks — `cta-button.test.tsx`, `header.test.tsx`, `features.test.tsx`, `server-error-state.test.tsx`, `cta-section.test.tsx`, `highlights.test.tsx`, `alert-dialog-error-state.test.tsx`, `invitation-list-error-state.test.tsx`, `team-info-error-state.test.tsx`, `hero.test.tsx`
- [x] [P] 10.3 Fix `src/components/custom/__tests__/person-item.test.tsx` and `team-item.test.tsx`: replace `container.querySelector()` with `screen` queries (testing-library/no-node-access + no-container)
- [x] [P] 10.4 Fix `src/infrastructure/db/repositories/__tests__/record.repository.test.ts`: `(stage: any)` → `(stage: Record<string, unknown>)`
- [x] [P] 10.5 Fix `src/applications/usecases/record/__tests__/record-errors.test.ts`: `{} as any` → use fixture factories or `as unknown as T`
- [x] [P] 10.6 Fix `src/components/landing/__tests__/highlights.test.tsx`: convert `require("motion/react")` to import
- [x] [P] 10.7 Fix `src/__tests__/helpers/fixtures.ts`: remove unused import if applicable
- [x] 10.8 Run `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` — verify all pass

## 11. Final Verification (Phase 2)

- [ ] 11.1 Run full `npm test` — all 587 tests pass, 0 skipped
- [ ] 11.2 Run `npm run lint` — exactly 4 warnings (schema `no-unused-vars` only), 0 errors
- [ ] 11.3 Run `npx tsc --noEmit` — 0 errors
- [ ] 11.4 Run `npm run build` — succeeds
