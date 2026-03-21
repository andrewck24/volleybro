## Why

The test suite uses a single `jsdom` environment for all 61 test files, forcing backend tests (entities, use cases, infrastructure) to load unnecessary browser API mocks and pay the jsdom startup penalty. The monolithic `jest.setup.ts` (247 lines) mixes frontend and backend concerns. Repository mock definitions are copy-pasted across 15+ files, and 46 `as any` casts circumvent type safety. UseCase tests mix Classical and London testing styles inconsistently, with 39 `toHaveBeenCalledWith` behavior assertions that break on internal refactors without catching real bugs. This refactor establishes a scalable, maintainable test infrastructure before the codebase grows further.

## What Changes

- **Jest environment isolation**: Split the single Jest config into two `projects` — `backend` (node environment) and `frontend` (jsdom environment) — each with its own setup file
- **Setup file separation**: Split `jest.setup.ts` into `jest.setup.backend.ts` (DB mocks only) and `jest.setup.frontend.ts` (browser API + React mocks only)
- **Mock factory creation**: Create shared `createMock*Repository()` factory functions in `src/__tests__/helpers/mock-repositories.ts` to eliminate 15+ copy-pasted repository mock definitions
- **Fixture factory creation**: Create shared `create*()` fixture factory functions in `src/__tests__/helpers/fixtures.ts` to standardize test data — each factory returns a valid entity with sensible defaults and accepts `Partial<T>` overrides so tests only specify the fields they care about
- **UseCase test style migration**: Remove behavior verification (`toHaveBeenCalledWith`) from UseCase-layer tests, keeping only state verification (Classical/Detroit style). Controller tests retain London-style behavior verification where appropriate.

## Capabilities

### New Capabilities

(none — this is a test infrastructure refactor with no new user-facing or spec-level capabilities)

### Modified Capabilities

(none — no spec-level behavior changes, only internal test tooling)

## Impact

- Affected code:
  - `jest.config.ts` — rewritten to use `projects` array
  - `jest.setup.ts` — split into `jest.setup.backend.ts` + `jest.setup.frontend.ts` (original removed)
  - `src/__tests__/helpers/mock-repositories.ts` — new file (mock factories)
  - `src/__tests__/helpers/fixtures.ts` — new file (fixture factories)
  - `src/__tests__/helpers/index.ts` — new file (re-exports)
  - `src/applications/usecases/**/*.test.ts` — remove `toHaveBeenCalledWith` assertions, adopt mock factories and fixture factories
  - `src/interface/controllers/**/*.test.ts` — adopt mock factories (retain behavior verification)
  - `src/infrastructure/db/repositories/tests/**/*.test.ts` — adopt mock factories
  - All 61 test files may need minor adjustments for environment-specific setup imports
