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

- [ ] [P] 5.1 Consolidate infrastructure test directories — merge `src/infrastructure/db/repositories/tests/__tests__/*.test.ts` into `src/infrastructure/db/repositories/__tests__/` and update imports
- [ ] [P] 5.2 Move `src/infrastructure/db/repositories/tests/helpers/` utilities (`createMockDocument`, `setupModelMocks`) into `src/__tests__/helpers/`, fix `no-explicit-any` lint errors in the moved helpers, update all imports, and remove empty `tests/` directory
- [ ] [P] 5.3 Migrate infrastructure tests (files in `src/infrastructure/`): adopt mock factories and fixture factories where applicable
- [ ] [P] 5.4 Migrate API route tests (files in `src/app/api/`): adopt mock factories and fixture factories where applicable
- [ ] 5.5 Unskip `record.repository.test.ts` (remove `describe.skip`) and fix complex mocking issues that caused it to be skipped
- [ ] 5.6 Run `npm test`, `npm run lint`, `npm run build` — verify all infrastructure and API route tests pass

## 6. Migrate Component and Lib Tests (Frontend)

- [ ] [P] 6.1 Migrate component tests (12 files in `src/components/`): adopt fixture factories where applicable, verify they work under jsdom project
- [ ] [P] 6.2 Migrate lib tests (9 files in `src/lib/`): adopt fixture factories where applicable
- [ ] 6.3 Run `npm test`, `npm run lint`, `npm run build` — verify all frontend tests pass

## 7. Final Verification

- [ ] 7.1 Run full `npm test` — confirm all 67 tests pass, review coverage output
- [ ] 7.2 Run `npm run lint` and `npm run build` — no errors
- [ ] 7.3 Verify no remaining `as any` casts in mock definitions that are now covered by factories
