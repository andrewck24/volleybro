# CLAUDE.md

## Development Commands

### Core Development

- `npm run dev` - Start [development server](http://localhost:3000)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint code checking
- `npm test` - Run Jest unit tests
- `npm run test:watch` - Run tests in watch mode

### Component Development

- `npm run storybook` - Start Storybook UI workbench (port 6006)
- `npm run build-storybook` - Build Storybook for production
- `npm run chromatic` - Deploy to Chromatic for visual testing

## Project Architecture

VolleyBro is a volleyball team management and match recording web application built with **Clean Architecture** principles and **Domain-Driven Design (DDD)**.
For a detailed version, see the [Architecture Documentation](./docs/architecture/index.md).

### Technology Stack

- **Frontend**: Next.js 15+ (React 19), TypeScript
- **UI**: Shadcn/UI components + Tailwind CSS
- **State Management**: Redux Toolkit + SWR for data fetching
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js v5 (Auth.js) with Google OAuth
- **Dependency Injection**: InversifyJS
- **PWA**: @serwist/next for Progressive Web App features
- **Testing**: Jest (to be refactored with optimal testing tools)

Detailed tech-stack info [docs](./docs/architecture/tech-stack.md)

### Clean Architecture Layers

Detailed source tree info [docs](./docs/architecture/source-tree.md)
The codebase follows Clean Architecture with these layers:

1. **Domain Layer** (`src/entities/`)
   - Core business entities: User, Team, Member, Record, Match, Set
   - Pure business logic with no external dependencies

2. **Application Layer** (`src/applications/`)
   - `usecases/` - Business use cases (CreateRecord, UpdateRally, etc.)
   - `repositories/` - Abstract interfaces for data access
   - `services/` - Abstract interfaces for external services

3. **Infrastructure Layer** (`src/infrastructure/`)
   - `db/repositories/` - MongoDB repository implementations
   - `services/` - Authentication and authorization services
   - `di/` - InversifyJS dependency injection container

4. **Interface Layer** (`src/interface/controllers/`)
   - API controllers that orchestrate use cases

5. **Presentation Layer**
   - `src/app/` - Next.js App Router (pages, layouts, API routes)
   - `src/components/` - React UI components organized by domain

### Component Organization

Components are organized by domain and purpose (features):

- `src/components/ui/` - Reusable UI components (Shadcn/UI based)
- `src/components/custom/` - Project-specific reusable components
- `src/components/auth/` - Authentication-related components
- `src/components/team/` - Team management components
- `src/components/record/` - Match recording components
- `src/components/match/` - Match viewing/analysis components
- `src/components/landing/` - Landing page components

### Key Features

1. **User Management**: Registration, authentication, profile management, team invitations
2. **Team Management**: Create/edit teams, member management, lineup configuration
3. **Match Recording**: Real-time match recording with detailed statistics
4. **Data Analysis**: Match statistics, visualizations, and historical data

### Database Design

Uses MongoDB with embedded documents for performance:

- **User**: Links to teams (joined/inviting arrays)
- **Team**: Contains members array and lineups array
- **Record**: Embeds complete match data including teams and sets
- **Member**: References team_id with player information

### Authentication Flow

- NextAuth.js v5 with Google OAuth provider
- Custom user type extensions in `src/auth.config.ts`
- Protected routes use middleware.ts for route guarding
- User sessions include team membership information

### State Management

- **Redux Toolkit**: Complex application state (record-slice.ts, lineup-slice.ts)
- **SWR**: Server state management and caching
- **React Hook Form**: Form state management

### Code Style Guidelines

Detailed coding standards [docs](./docs/architecture/coding-standards.md)

- **Code Formatting**: Prettier with Airbnb JavaScript/TypeScript style guide
- **Linting**: ESLint configured with Airbnb rules
- Follow existing TypeScript patterns and interfaces
- Use established component patterns from `src/components/ui/`
- Implement new features following Clean Architecture layers
- Authentication logic should use existing Auth.js patterns
- Database operations should go through repository pattern

### Testing Strategy

**Status**: ✅ **UPDATED** - Unified testing environment established (2024-08-11)
Detailed testing strategy [docs](./docs/architecture/testing-strategy.md)

#### Current Configuration

- **Test Environment**: Unified `jsdom` environment for all tests
- **Framework**: Jest with Next.js integration (`next/jest`)
- **Coverage**: Comprehensive test coverage for landing page components (95%+)
- **Setup**: Single `jest.setup.ts` file with unified configuration

#### Key Decisions and Rationale

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

#### Test Structure

```txt
src/
├── components/landing/__tests__/     # Component unit tests
├── infrastructure/__tests__/         # Infrastructure layer tests (mocked)
├── applications/__tests__/           # Use case tests
├── entities/__tests__/               # Domain logic tests
└── lib/features/*/test/             # Feature-specific helper tests
```

#### Testing Commands

- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report

#### Pre-commit Checklist

⚠️ **IMPORTANT**: Before every commit, ensure the following steps pass:

1. `npm test` - All tests must pass
2. `npm run lint` - No linting errors
3. `npm run build` - Build succeeds without errors
4. Check for TypeScript errors in IDE
5. Verify no breaking changes to existing functionality
6. 在撰寫 commit msg 時，遵循 Angular commit convention

#### Known Testing Issues

**Note**: Check during each test run whether these issues still exist

⚠️ **TODO: Database Test Mocking**

- **Issue**: Repository tests skipped due to complex mocking requirements
- **Solution**: Implement detailed mocks in test files or use `@shelf/jest-mongodb`
- **Files**: `src/infrastructure/db/repositories/tests/**` (currently skipped with TODO comments)
- **Priority**: Low (infrastructure tests, not affecting core functionality)
- **Check**: Run `npm test` and verify repository tests are properly skipped

### Development Notes

- The project supports both English and Traditional Chinese
- PWA functionality is implemented for mobile-first experience
- Uses Storybook for component development and documentation
- Implements dependency injection with InversifyJS for better testability
- Follow existing commit message conventions (Conventional Commits)
- **Pre-development**: Rebuild testing environment following BDD principles

### Environment Variables

- `AUTH_GOOGLE_ID` - Google OAuth client ID
- `AUTH_GOOGLE_SECRET` - Google OAuth client secret
- `MONGODB_URI` - MongoDB connection string
