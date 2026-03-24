## Context

The project has 61 test files all running under a single `jsdom` environment via one `jest.config.ts`. The 247-line `jest.setup.ts` mixes browser API mocks (IntersectionObserver, ResizeObserver, matchMedia, next/image, motion/react) with database mocks (mongodb, mongoose, bson). Backend tests pay unnecessary jsdom startup cost and load irrelevant browser mocks. Repository mock definitions are duplicated across 15+ files with no shared helpers, and UseCase tests inconsistently mix Classical and London testing styles.

## Goals / Non-Goals

**Goals:**

- Isolate frontend and backend test environments using Jest `projects`
- Eliminate mock duplication via shared factory functions
- Establish a consistent layer-based testing strategy (Classical for UseCase/Entity/Infra, London for Controller)
- Improve test maintainability and type safety (remove `as any` casts where mock factories apply)

**Non-Goals:**

- Restructuring record domain usecase files (Change 2)
- Adding API integration tests with Bruno (Change 3)
- Increasing test coverage — this change refactors infrastructure, not test content
- Changing any application or business logic

## Decisions

### Jest projects configuration for environment isolation

Use Jest's `projects` array to define two sub-projects within a single `jest.config.ts`:

- **backend** project: `testEnvironment: 'node'`, matches `**/entities/**`, `**/applications/**`, `**/infrastructure/**`, `**/interface/**`
- **frontend** project: `testEnvironment: 'jsdom'`, matches `**/components/**`, `**/lib/**`, `**/app/**/page.test.*`

**Why over separate config files**: Single config is easier to maintain, shares common settings (coverage, moduleNameMapper, transforms), and `npm test` runs everything in one command.

**Why over `@jest-environment` docblocks per file**: Per-file docblocks require touching all 61 files and are easy to forget on new files. Projects-based approach applies the correct environment by convention (file path).

### Split setup files by environment

- `jest.setup.backend.ts`: mongodb, mongoose, bson mocks + fetch mock + console warning suppression
- `jest.setup.frontend.ts`: All of `jest.setup.backend.ts` content is NOT included. Contains: `@testing-library/jest-dom`, `jest-axe`, IntersectionObserver, ResizeObserver, matchMedia, next/link, next/image, motion/react, motion/react-m mocks, fetch mock, console warning suppression

Each project in `jest.config.ts` references only its own `setupFilesAfterSetup` file. The original `jest.setup.ts` is removed after migration.

### Mock factory functions for repository interfaces

Create `src/__tests__/helpers/mock-repositories.ts` with one factory per repository interface:

```
createMockPlayerRepository() → jest.Mocked<IPlayerRepository>
createMockTeamRepository()   → jest.Mocked<ITeamRepository>
createMockRecordRepository() → jest.Mocked<IRecordRepository>
createMockUserRepository()   → jest.Mocked<IUserRepository>
```

Each factory returns an object with all interface methods as `jest.fn()`. TypeScript enforces completeness — if an interface adds a method, the factory fails to compile until updated.

**Why factory functions over `jest.createMockFromModule`**: Auto-mocking loses control over return types and is harder to debug. Explicit factories are transparent and type-safe.

**Why not `__mocks__/` directory**: Jest automatic mocks apply globally and are harder to configure per-test. Factory functions are explicit and composable.

### Fixture factory functions for test entities

Create `src/__tests__/helpers/fixtures.ts` with one factory per commonly-used entity:

```
createPlayer(overrides?: Partial<Player>)   → Player
createTeam(overrides?: Partial<Team>)       → Team
createRecord(overrides?: Partial<Record>)   → Record
createUser(overrides?: Partial<User>)       → User
```

Each factory returns a fully-valid entity with sensible defaults. Tests override only the fields relevant to their scenario, making test intent clear.

### Mock factory functions for auth services

Create auth service mock factories in the same `mock-repositories.ts` file (or a separate `mock-services.ts` if it grows large):

```
createMockAuthenticationService() → jest.Mocked<IAuthenticationService>
createMockAuthorizationService()  → jest.Mocked<IAuthorizationService>
```

These are used across nearly all UseCase and Controller tests alongside repository mocks.

### Layer-based testing strategy

| Layer          | Style     | Mock Scope                          | Verify                    |
|----------------|-----------|-------------------------------------|---------------------------|
| Entity         | Classical | Zero mock                           | State (return values)     |
| UseCase        | Classical | Repository + service interfaces     | State (return values)     |
| Infrastructure | Classical | DB driver (mongoose model)          | State (query results)     |
| Controller     | London    | UseCase classes                     | Behavior (calls + state)  |
| API Route      | Skip      | (covered by future Bruno tests)     | —                         |
| Component      | Classical | API/hooks                           | Render output + interaction |

**Key migration**: UseCase tests remove `toHaveBeenCalledWith` assertions. The fact that a repository method was called correctly is verified by the repository's own tests, not the UseCase consumer.

## Risks / Trade-offs

- **[Risk] Test path matching may misclassify files** → Mitigation: Review glob patterns against actual test file paths before finalizing. Files in `src/lib/` that test pure utilities (not React) will run in jsdom unnecessarily — acceptable since they're few and don't break under jsdom.
- **[Risk] Removing `toHaveBeenCalledWith` from UseCase tests reduces defect localization** → Mitigation: UseCase tests still mock repositories and verify return values. If a UseCase passes wrong args to a repo, the returned mock value won't match expectations. For critical paths, repository tests provide the missing coverage.
- **[Risk] Large number of files to touch (61 test files)** → Mitigation: Mock factory adoption can be incremental — tests that import the factory work alongside tests that still inline mocks. Full migration is the goal but partial progress is still valuable.
