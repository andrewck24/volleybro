# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development

- `npm run dev` - Start development server (http://localhost:3000)
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

### Technology Stack

- **Frontend**: Next.js 15+ (React 19), TypeScript
- **UI**: Shadcn/UI components + Tailwind CSS
- **State Management**: Redux Toolkit + SWR for data fetching
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js v5 (Auth.js) with Google OAuth
- **Dependency Injection**: InversifyJS
- **PWA**: @serwist/next for Progressive Web App features
- **Testing**: Jest (to be refactored with optimal testing tools)

### Clean Architecture Layers

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

Components are organized by domain and purpose:

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

- **Code Formatting**: Prettier with Airbnb JavaScript/TypeScript style guide
- **Linting**: ESLint configured with Airbnb rules
- Follow existing TypeScript patterns and interfaces
- Use established component patterns from `src/components/ui/`
- Implement new features following Clean Architecture layers
- Authentication logic should use existing Auth.js patterns
- Database operations should go through repository pattern
- 在撰寫 commit msg 時，遵循 Angular commit convention

### Testing Strategy (Important Notes)

**CRITICAL**: Before starting development, the testing environment needs to be rebuilt:

1. **Current State**: The existing test setup requires refactoring
2. **Planned Approach**:
   - **BDD (Behavior-Driven Development)**: Write tests before implementation
   - **Separation**: Frontend and backend testing environments will be separated
   - **Optimal Tools**: Will use the most suitable testing tools for each layer
3. **Action Required**: Establish proper testing infrastructure following best practices before new feature development

Current Jest setup separates frontend/backend but needs improvement:

- Frontend tests: Components and pages (jsdom environment)
- Backend tests: API routes, use cases, repositories (node environment)

### Development Notes

- The project supports both English and Traditional Chinese
- PWA functionality is implemented for mobile-first experience
- Uses Storybook for component development and documentation
- Implements dependency injection with InversifyJS for better testability
- Follow existing commit message conventions (Conventional Commits)
- **Pre-development**: Rebuild testing environment following BDD principles

### Environment Variables

Required environment variables:

- `AUTH_GOOGLE_ID` - Google OAuth client ID
- `AUTH_GOOGLE_SECRET` - Google OAuth client secret
- `MONGODB_URI` - MongoDB connection string
