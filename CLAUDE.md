# VolleyBro Project Architecture

VolleyBro is a volleyball team management and match recording web application built with **Clean Architecture** principles.
For a detailed version, see the [Architecture Documentation](./docs/architecture/index.md).

## Technology Stack

- **Frontend**: Next.js 16+ (React 19), TypeScript
- **UI**: Shadcn/UI components + Tailwind CSS
- **State Management**: Redux Toolkit + SWR for data fetching + React Hook Form
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Better Auth with Google OAuth
- **Dependency Injection**: InversifyJS
- **PWA**: @serwist/next (configurator mode) for Progressive Web App features
- **Testing**: Jest, Storybook (to be refactored with optimal testing tools)

Detailed tech-stack info [docs](./docs/architecture/tech-stack.md)

## Clean Architecture Layers

Detailed source tree info [docs](./docs/architecture/source-tree.md)

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

## Component Organization

Components are organized by domain and purpose (features):

- `src/components/ui/` - Reusable UI components (Shadcn/UI based)
- `src/components/custom/` - Project-specific reusable components
- `src/components/auth/` - Authentication-related components
- `src/components/team/` - Team management components
- `src/components/record/` - Match recording components
- `src/components/match/` - Match viewing/analysis components
- `src/components/landing/` - Landing page components

## Key Features

1. **User Management**: Registration, authentication, profile management, team invitations
2. **Team Management**: Create/edit teams, member management, lineup configuration
3. **Match Recording**: Real-time match recording with detailed statistics
4. **Data Analysis**: Match statistics, visualizations, and historical data

## Database Design

- **User**: Authentication data managed by Better Auth
- **Profile**: User's personal information and preferences
- **Player**: References userId, teamId with player information
- **Team**: Contains lineups array, team information
- **Record**: Embeds complete match data including teams and sets

## Authentication Flow

- Better Auth with Google OAuth provider (configured in `src/lib/auth.ts`)
- Client-side authentication using Better Auth React client (`src/lib/auth-client.ts`)
- Server-side session validation via `auth.api.getSession()` in API routes
- User and Profile separation:
  - **User**: Authentication data (Better Auth managed)
  - **Profile**: Business data (application managed, linked via userId)
- Profile auto-creation on first access to `/api/profiles`

## Code Style Guidelines

Detailed coding standards [docs](./docs/architecture/coding-standards.md)

- **Code Formatting**: Prettier with Airbnb JavaScript/TypeScript style guide
- **Linting**: ESLint configured with Airbnb rules
- Follow existing TypeScript patterns and interfaces
- Use established component patterns from `src/components/ui/`
- Implement new features following Clean Architecture layers
- Authentication logic should use existing Auth.js patterns

## Pre-commit Checklist

**IMPORTANT**: Before every commit, ensure the following steps pass:

1. `npm test` - All tests must pass
2. `npm run lint` - No linting errors
3. `npm run build` - Build succeeds without errors
4. Check for TypeScript errors in IDE
5. Verify no breaking changes to existing functionality
