# Testing Strategy

**Status**: ✅ **UPDATED** - Unified testing environment established (2024-08-11)
Detailed testing strategy [docs](./docs/architecture/testing-strategy.md)

## Current Configuration

- **Test Environment**: Unified `jsdom` environment for all tests
- **Framework**: Jest with Next.js integration (`next/jest`)
- **Coverage**: Comprehensive test coverage for landing page components (95%+)
- **Setup**: Single `jest.setup.ts` file with unified configuration

## Key Decisions and Rationale

1. **Unified jsdom Environment** (vs. separated frontend/backend environments)
   - **Rationale**: Next.js best practices recommend unified environment
   - **Benefits**:
     - Simplified configuration maintenance
     - No ES modules vs CommonJS syntax conflicts
     - Universal components testing matches runtime behavior
     - Clean Architecture layers are environment-agnostic

2. **MongoDB Mock Strategy** (short-term solution)
   - **Problem**: BSON ES modules causing Jest parsing errors
   - **Solution**: Mock `mongodb`, `mongoose`, and `bson` modules in `jest.setup.ts`
   - **Benefits**:
     - Avoids `transformIgnorePatterns` complexity
     - Faster test execution
     - True unit testing isolation
   - **Future Considerations**:
     - Medium-term: Evaluate `@shelf/jest-mongodb` for integration testing
     - Long-term: Consider Vitest migration for better ES module support

3. **Alternative Solutions Evaluated**:
   - ❌ `transformIgnorePatterns`: Complex Next.js overrides, maintenance burden
   - ✅ `@shelf/jest-mongodb`: Official Jest preset (future consideration)
   - ✅ Vitest migration: Better ES module support (long-term option)

## Test Structure

```txt
src/
├── components/landing/__tests__/     # Component unit tests
├── infrastructure/__tests__/         # Infrastructure layer tests (mocked)
├── applications/__tests__/           # Use case tests
├── entities/__tests__/               # Domain logic tests
└── lib/features/*/test/             # Feature-specific helper tests
```

## Testing Commands

- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report

## Known Testing Issues

**Note**: Check during each test run whether these issues still exist

**TODO:** Database Test Mocking

- **Issue**: Repository tests skipped due to complex mocking requirements
- **Solution**: Implement detailed mocks in test files or use `@shelf/jest-mongodb`
- **Files**: `src/infrastructure/db/repositories/tests/**` (currently skipped with TODO comments)
- **Priority**: Low (infrastructure tests, not affecting core functionality)
- **Check**: Run `npm test` and verify repository tests are properly skipped
