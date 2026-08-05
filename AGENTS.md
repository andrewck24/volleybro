# Delivery Workflow Bridge

Read root [`WORKFLOW.md`](WORKFLOW.md) before intake, planning, implementation, review, handoff, or archive work. It is the canonical provider-neutral delivery contract; this file retains Codex and Antigravity mechanics and hard repository rules only.
Repository-specific Matt Pocock adaptations live in `docs/agents/`. Read the issue-tracker, domain, Blueprint, and artifact-lifecycle adapters selected by `WORKFLOW.md`; never modify installed Matt skills to encode VolleyBro policy.
Use the engineering skill selected by `WORKFLOW.md` for the current stage. Grilling and Wayfinder support discussion; specification and implementation-slice generation prepare approved work; Apply remains the same repository procedure whether a developer invokes it manually or Symphony invokes it after dispatch. Do not treat a tool-specific artifact system as a second lifecycle authority.

## VolleyBro Introduction

VolleyBro is a volleyball team management and match recording web application built with **Clean Architecture** principles.

### Technology Stack

- **Frontend**: Next.js 16+ (React 19), TypeScript
- **UI**: Shadcn/UI components + Tailwind CSS
- **State Management**: Redux Toolkit + SWR for data fetching + React Hook Form
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Better Auth with Google OAuth
- **Dependency Injection**: InversifyJS
- **PWA**: @serwist/turbopack (prerendered service-worker route) for Progressive Web App features
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

- For complex commits, include a body focused on **why**; "what" may be included as supporting context
- Never use `spectra`, `openspec`, or any tooling name as the commit type or scope; use standard conventional commit types (`feat`, `fix`, `chore`, `docs`, etc.) with short scopes
- **Judgment-type deletions require discussion first**: when a cleanup tool (knip, dead-code audits) or your own analysis flags source files for deletion beyond the explicitly requested change scope, list the candidates with per-file rationale and get confirmation before deleting. "Unreferenced in the import graph" is not sufficient evidence by itself — files may be documented API contracts (see `design-tokens.ts`), aliases of live database collections, or reserved for planned features.
- In all Change artifacts, reference other changes by kebab-case name (e.g., `` `type-decoupling` change ``), never by letter labels (A, B, C)

### Pull request review

The required independent code-review and fix rounds run before PR creation as defined by
`WORKFLOW.md`. Human PR comments and their fix rounds are optional, and the default merge path does
not wait for them. If optional feedback changes durable knowledge, update the archived Blueprint
Change and promoted authorities before merge.

See also: [`docs/testing-strategy.md`](docs/testing-strategy.md) for test guidelines, [`docs/maintenance-policy.md`](docs/maintenance-policy.md) for maintenance policies, and [`docs/design-system.md`](docs/design-system.md) for the color/elevation reference.
