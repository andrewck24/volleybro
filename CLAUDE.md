<!-- SPECTRA:START v1.0.2 -->

# Spectra Instructions

This project uses Spectra for Spec-Driven Development(SDD). Specs live in `openspec/specs/`, change proposals in `openspec/changes/`.

## Use `/spectra-*` skills when:

- A discussion needs structure before coding → `/spectra-discuss`
- User wants to plan, propose, or design a change → `/spectra-propose`
- Tasks are ready to implement → `/spectra-apply`
- There's an in-progress change to continue → `/spectra-ingest`
- User asks about specs or how something works → `/spectra-ask`
- Implementation is done → `/spectra-archive`
- Commit only files related to a specific change → `/spectra-commit`

## Workflow

discuss? → propose → apply ⇄ ingest → archive

- `discuss` is optional — skip if requirements are clear
- Requirements change mid-work? Plan mode → `ingest` → resume `apply`

## Parked Changes

Changes can be parked（暫存）— temporarily moved out of `openspec/changes/`. Parked changes won't appear in `spectra list` but can be found with `spectra list --parked`. To restore: `spectra unpark <name>`. The `/spectra-apply` and `/spectra-ingest` skills handle parked changes automatically.

<!-- SPECTRA:END -->

## VolleyBro Introduction

VolleyBro is a volleyball team management and match recording web application built with **Clean Architecture** principles.

### Technology Stack

- **Frontend**: Next.js 16+ (React 19), TypeScript
- **UI**: Shadcn/UI components + Tailwind CSS
- **State Management**: Redux Toolkit + SWR for data fetching + React Hook Form
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Better Auth with Google OAuth
- **Dependency Injection**: InversifyJS
- **PWA**: @serwist/next (configurator mode) for Progressive Web App features
- **Testing**: Jest, Storybook (to be refactored with optimal testing tools)

### Clean Architecture Layers

1. **Domain Layer** (`src/entities/`)
   - Core business entities: User, Team, Member, Game, Match, Set
   - Pure business logic with no external dependencies

2. **Application Layer** (`src/applications/`)
   - `usecases/` - Business use cases (CreateGame, UpdateRally, etc.)
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
- `src/components/game/` - Game recording, overview, and analysis components
- `src/components/landing/` - Landing page components

### Key Features

1. **User Management**: Registration, authentication, profile management, team invitations
2. **Team Management**: Create/edit teams, member management, lineup configuration
3. **Game Recording**: Real-time game recording with detailed statistics
4. **Data Analysis**: Game statistics, visualizations, and historical data

**IMPORTANT**:

- When `/spectra-apply`ing a change:
  - Commit after each task section; message states the section purpose and includes related artifacts (tasks.md, spec files, etc.)
  - Run `pnpm type-check` before each commit; `pnpm build` before the final commit
  - Skip checks only if the section is intentionally incomplete; final commit MUST pass both
- For complex commits, include a body focused on **why**; "what" may be included as supporting context

See also: [`docs/testing-strategy.md`](docs/testing-strategy.md) for test guidelines, and [`docs/maintenance-policy.md`](docs/maintenance-policy.md) for maintenance policies.
