## ADDED Requirements

### Requirement: User search by email

The system SHALL support searching for users by exact email match via `GET /api/users?email={email}` (Interface + Application layers). The endpoint SHALL require authentication.

#### Scenario: Search finds a registered user

- **WHEN** an authenticated user sends `GET /api/users?email=alice@example.com` and the email matches a registered user
- **THEN** the API SHALL respond with HTTP 200 and `{ _id, name, image }`
- **THEN** the response SHALL NOT include `email`, `emailVerified`, `createdAt`, `updatedAt`, or other sensitive fields

#### Scenario: Search finds no user

- **WHEN** an authenticated user sends `GET /api/users?email=unknown@example.com` and no user matches
- **THEN** the API SHALL respond with HTTP 404

#### Scenario: Unauthenticated request

- **WHEN** an unauthenticated client sends `GET /api/users?email=alice@example.com`
- **THEN** the API SHALL respond with HTTP 401

#### Scenario: Invalid email format

- **WHEN** an authenticated user sends `GET /api/users?email=not-an-email`
- **THEN** the API SHALL respond with HTTP 400 with a validation error


<!-- @trace
source: player-invitations
updated: 2026-03-17
code:
  - src/applications/types/result.ts
  - src/components/team/players/membership-section.tsx
  - src/applications/usecases/player/create-player.usecase.ts
  - src/components/home/index.tsx
  - src/infrastructure/db/mongoose/schemas/player.ts
  - src/components/user/menu/index.tsx
  - src/components/ui/alert-dialog.tsx
  - src/applications/usecases/player/reject-invitation.usecase.ts
  - src/lib/auth.ts
  - src/infrastructure/db/repositories/player.repository.mongo.ts
  - src/components/user/invitations/index.tsx
  - src/app/api/players/[playerId]/invitations/route.ts
  - src/applications/usecases/user/profile.usecase.ts
  - src/lib/validations/player.ts
  - src/infrastructure/db/repositories/index.ts
  - src/applications/usecases/user/search-user.usecase.ts
  - src/applications/usecases/player/cancel-invitation.usecase.ts
  - src/interface/controllers/user/user.controller.ts
  - src/interface/controllers/user/profile.controller.ts
  - package.json
  - src/applications/repositories/profile.repository.interface.ts
  - src/app/api/users/route.ts
  - src/applications/usecases/user/get-user-by-id.usecase.ts
  - src/components/team/info/index.tsx
  - src/hooks/use-data.ts
  - src/applications/usecases/player/leave-team.usecase.ts
  - src/applications/usecases/player/accept-invitation.usecase.ts
  - src/applications/usecases/team/create-team.usecase.interface.ts
  - src/components/team/invitation-list.tsx
  - src/applications/usecases/player/create-invitation.usecase.ts
  - CLAUDE.md
  - src/interface/controllers/player/invitation.controller.ts
  - src/entities/player.ts
  - src/components/team/confirmation/index.tsx
  - src/applications/errors/app-error.ts
  - src/infrastructure/db/repositories/player.repository.ts
  - src/components/notifications/index.tsx
  - src/infrastructure/db/repositories/profile.repository.mongo.ts
  - src/infrastructure/di/inversify.config.ts
  - src/app/api/users/teams/route.ts
  - src/infrastructure/db/mongoose/schemas/profile.ts
  - src/app/api/teams/route.ts
  - src/components/team/index.tsx
  - AGENTS.md
  - src/components/layout/nav/links.tsx
  - src/infrastructure/di/types.ts
  - src/applications/usecases/team/create-team.usecase.ts
  - src/applications/usecases/user/link-pending-invitations.usecase.ts
  - src/applications/repositories/player.repository.interface.ts
  - src/infrastructure/db/repositories/base.repository.mongo.ts
  - src/entities/profile.ts
  - src/interface/controllers/team/team.controller.ts
  - src/lib/auth-hook.ts
tests:
  - src/components/team/__tests__/invitation-list.test.tsx
  - src/applications/usecases/player/__tests__/leave-team.usecase.test.ts
  - src/applications/errors/__tests__/app-error.test.ts
  - src/infrastructure/db/repositories/__tests__/player.repository.test.ts
  - src/lib/__tests__/auth-hook.test.ts
  - src/entities/__tests__/player.test.ts
  - src/applications/usecases/player/__tests__/cancel-invitation.usecase.test.ts
  - src/applications/usecases/player/__tests__/accept-invitation.usecase.test.ts
  - src/infrastructure/db/repositories/tests/__tests__/player.repository.test.ts
  - src/applications/usecases/user/__tests__/link-pending-invitations.usecase.test.ts
  - src/applications/usecases/player/__tests__/get-user-players.usecase.test.ts
  - src/applications/errors/__tests__/result.test.ts
  - src/applications/usecases/player/__tests__/reject-invitation.usecase.test.ts
  - src/applications/usecases/player/__tests__/create-invitation.usecase.test.ts
  - src/applications/usecases/user/__tests__/search-user.usecase.test.ts
  - src/applications/usecases/user/__tests__/create-profile.usecase.test.ts
  - src/lib/validations/__tests__/player.test.ts
  - src/applications/usecases/player/__tests__/create-player.usecase.test.ts
-->

### Requirement: Backward-compatible self-lookup

When `GET /api/users` is called without query parameters, it SHALL return the current authenticated user's full profile (existing behavior preserved).

#### Scenario: Get current user without search params

- **WHEN** an authenticated user sends `GET /api/users` (no query params)
- **THEN** the API SHALL respond with the full user object (existing behavior)


<!-- @trace
source: player-invitations
updated: 2026-03-17
code:
  - src/applications/types/result.ts
  - src/components/team/players/membership-section.tsx
  - src/applications/usecases/player/create-player.usecase.ts
  - src/components/home/index.tsx
  - src/infrastructure/db/mongoose/schemas/player.ts
  - src/components/user/menu/index.tsx
  - src/components/ui/alert-dialog.tsx
  - src/applications/usecases/player/reject-invitation.usecase.ts
  - src/lib/auth.ts
  - src/infrastructure/db/repositories/player.repository.mongo.ts
  - src/components/user/invitations/index.tsx
  - src/app/api/players/[playerId]/invitations/route.ts
  - src/applications/usecases/user/profile.usecase.ts
  - src/lib/validations/player.ts
  - src/infrastructure/db/repositories/index.ts
  - src/applications/usecases/user/search-user.usecase.ts
  - src/applications/usecases/player/cancel-invitation.usecase.ts
  - src/interface/controllers/user/user.controller.ts
  - src/interface/controllers/user/profile.controller.ts
  - package.json
  - src/applications/repositories/profile.repository.interface.ts
  - src/app/api/users/route.ts
  - src/applications/usecases/user/get-user-by-id.usecase.ts
  - src/components/team/info/index.tsx
  - src/hooks/use-data.ts
  - src/applications/usecases/player/leave-team.usecase.ts
  - src/applications/usecases/player/accept-invitation.usecase.ts
  - src/applications/usecases/team/create-team.usecase.interface.ts
  - src/components/team/invitation-list.tsx
  - src/applications/usecases/player/create-invitation.usecase.ts
  - CLAUDE.md
  - src/interface/controllers/player/invitation.controller.ts
  - src/entities/player.ts
  - src/components/team/confirmation/index.tsx
  - src/applications/errors/app-error.ts
  - src/infrastructure/db/repositories/player.repository.ts
  - src/components/notifications/index.tsx
  - src/infrastructure/db/repositories/profile.repository.mongo.ts
  - src/infrastructure/di/inversify.config.ts
  - src/app/api/users/teams/route.ts
  - src/infrastructure/db/mongoose/schemas/profile.ts
  - src/app/api/teams/route.ts
  - src/components/team/index.tsx
  - AGENTS.md
  - src/components/layout/nav/links.tsx
  - src/infrastructure/di/types.ts
  - src/applications/usecases/team/create-team.usecase.ts
  - src/applications/usecases/user/link-pending-invitations.usecase.ts
  - src/applications/repositories/player.repository.interface.ts
  - src/infrastructure/db/repositories/base.repository.mongo.ts
  - src/entities/profile.ts
  - src/interface/controllers/team/team.controller.ts
  - src/lib/auth-hook.ts
tests:
  - src/components/team/__tests__/invitation-list.test.tsx
  - src/applications/usecases/player/__tests__/leave-team.usecase.test.ts
  - src/applications/errors/__tests__/app-error.test.ts
  - src/infrastructure/db/repositories/__tests__/player.repository.test.ts
  - src/lib/__tests__/auth-hook.test.ts
  - src/entities/__tests__/player.test.ts
  - src/applications/usecases/player/__tests__/cancel-invitation.usecase.test.ts
  - src/applications/usecases/player/__tests__/accept-invitation.usecase.test.ts
  - src/infrastructure/db/repositories/tests/__tests__/player.repository.test.ts
  - src/applications/usecases/user/__tests__/link-pending-invitations.usecase.test.ts
  - src/applications/usecases/player/__tests__/get-user-players.usecase.test.ts
  - src/applications/errors/__tests__/result.test.ts
  - src/applications/usecases/player/__tests__/reject-invitation.usecase.test.ts
  - src/applications/usecases/player/__tests__/create-invitation.usecase.test.ts
  - src/applications/usecases/user/__tests__/search-user.usecase.test.ts
  - src/applications/usecases/user/__tests__/create-profile.usecase.test.ts
  - src/lib/validations/__tests__/player.test.ts
  - src/applications/usecases/player/__tests__/create-player.usecase.test.ts
-->

### Requirement: Rate limiting for user search

The user search endpoint SHALL enforce rate limiting to prevent email enumeration attacks.

#### Scenario: Rate limit exceeded

- **WHEN** an authenticated user exceeds the rate limit for user search requests
- **THEN** the API SHALL respond with HTTP 429


<!-- @trace
source: player-invitations
updated: 2026-03-17
code:
  - src/applications/types/result.ts
  - src/components/team/players/membership-section.tsx
  - src/applications/usecases/player/create-player.usecase.ts
  - src/components/home/index.tsx
  - src/infrastructure/db/mongoose/schemas/player.ts
  - src/components/user/menu/index.tsx
  - src/components/ui/alert-dialog.tsx
  - src/applications/usecases/player/reject-invitation.usecase.ts
  - src/lib/auth.ts
  - src/infrastructure/db/repositories/player.repository.mongo.ts
  - src/components/user/invitations/index.tsx
  - src/app/api/players/[playerId]/invitations/route.ts
  - src/applications/usecases/user/profile.usecase.ts
  - src/lib/validations/player.ts
  - src/infrastructure/db/repositories/index.ts
  - src/applications/usecases/user/search-user.usecase.ts
  - src/applications/usecases/player/cancel-invitation.usecase.ts
  - src/interface/controllers/user/user.controller.ts
  - src/interface/controllers/user/profile.controller.ts
  - package.json
  - src/applications/repositories/profile.repository.interface.ts
  - src/app/api/users/route.ts
  - src/applications/usecases/user/get-user-by-id.usecase.ts
  - src/components/team/info/index.tsx
  - src/hooks/use-data.ts
  - src/applications/usecases/player/leave-team.usecase.ts
  - src/applications/usecases/player/accept-invitation.usecase.ts
  - src/applications/usecases/team/create-team.usecase.interface.ts
  - src/components/team/invitation-list.tsx
  - src/applications/usecases/player/create-invitation.usecase.ts
  - CLAUDE.md
  - src/interface/controllers/player/invitation.controller.ts
  - src/entities/player.ts
  - src/components/team/confirmation/index.tsx
  - src/applications/errors/app-error.ts
  - src/infrastructure/db/repositories/player.repository.ts
  - src/components/notifications/index.tsx
  - src/infrastructure/db/repositories/profile.repository.mongo.ts
  - src/infrastructure/di/inversify.config.ts
  - src/app/api/users/teams/route.ts
  - src/infrastructure/db/mongoose/schemas/profile.ts
  - src/app/api/teams/route.ts
  - src/components/team/index.tsx
  - AGENTS.md
  - src/components/layout/nav/links.tsx
  - src/infrastructure/di/types.ts
  - src/applications/usecases/team/create-team.usecase.ts
  - src/applications/usecases/user/link-pending-invitations.usecase.ts
  - src/applications/repositories/player.repository.interface.ts
  - src/infrastructure/db/repositories/base.repository.mongo.ts
  - src/entities/profile.ts
  - src/interface/controllers/team/team.controller.ts
  - src/lib/auth-hook.ts
tests:
  - src/components/team/__tests__/invitation-list.test.tsx
  - src/applications/usecases/player/__tests__/leave-team.usecase.test.ts
  - src/applications/errors/__tests__/app-error.test.ts
  - src/infrastructure/db/repositories/__tests__/player.repository.test.ts
  - src/lib/__tests__/auth-hook.test.ts
  - src/entities/__tests__/player.test.ts
  - src/applications/usecases/player/__tests__/cancel-invitation.usecase.test.ts
  - src/applications/usecases/player/__tests__/accept-invitation.usecase.test.ts
  - src/infrastructure/db/repositories/tests/__tests__/player.repository.test.ts
  - src/applications/usecases/user/__tests__/link-pending-invitations.usecase.test.ts
  - src/applications/usecases/player/__tests__/get-user-players.usecase.test.ts
  - src/applications/errors/__tests__/result.test.ts
  - src/applications/usecases/player/__tests__/reject-invitation.usecase.test.ts
  - src/applications/usecases/player/__tests__/create-invitation.usecase.test.ts
  - src/applications/usecases/user/__tests__/search-user.usecase.test.ts
  - src/applications/usecases/user/__tests__/create-profile.usecase.test.ts
  - src/lib/validations/__tests__/player.test.ts
  - src/applications/usecases/player/__tests__/create-player.usecase.test.ts
-->

### Requirement: User search controller routing

The `GET /api/users` route SHALL use a controller to dispatch between self-lookup (no params) and user search (with email param), following the existing API pattern: auth check → Zod validation → controller → use case → response.

#### Scenario: Route dispatches to search use case

- **WHEN** `GET /api/users?email=alice@example.com` is received
- **THEN** the route SHALL delegate to a SearchUserUseCase via the user controller
- **THEN** the use case SHALL query the User collection by exact email match

## Requirements


<!-- @trace
source: player-invitations
updated: 2026-03-17
code:
  - src/applications/types/result.ts
  - src/components/team/players/membership-section.tsx
  - src/applications/usecases/player/create-player.usecase.ts
  - src/components/home/index.tsx
  - src/infrastructure/db/mongoose/schemas/player.ts
  - src/components/user/menu/index.tsx
  - src/components/ui/alert-dialog.tsx
  - src/applications/usecases/player/reject-invitation.usecase.ts
  - src/lib/auth.ts
  - src/infrastructure/db/repositories/player.repository.mongo.ts
  - src/components/user/invitations/index.tsx
  - src/app/api/players/[playerId]/invitations/route.ts
  - src/applications/usecases/user/profile.usecase.ts
  - src/lib/validations/player.ts
  - src/infrastructure/db/repositories/index.ts
  - src/applications/usecases/user/search-user.usecase.ts
  - src/applications/usecases/player/cancel-invitation.usecase.ts
  - src/interface/controllers/user/user.controller.ts
  - src/interface/controllers/user/profile.controller.ts
  - package.json
  - src/applications/repositories/profile.repository.interface.ts
  - src/app/api/users/route.ts
  - src/applications/usecases/user/get-user-by-id.usecase.ts
  - src/components/team/info/index.tsx
  - src/hooks/use-data.ts
  - src/applications/usecases/player/leave-team.usecase.ts
  - src/applications/usecases/player/accept-invitation.usecase.ts
  - src/applications/usecases/team/create-team.usecase.interface.ts
  - src/components/team/invitation-list.tsx
  - src/applications/usecases/player/create-invitation.usecase.ts
  - CLAUDE.md
  - src/interface/controllers/player/invitation.controller.ts
  - src/entities/player.ts
  - src/components/team/confirmation/index.tsx
  - src/applications/errors/app-error.ts
  - src/infrastructure/db/repositories/player.repository.ts
  - src/components/notifications/index.tsx
  - src/infrastructure/db/repositories/profile.repository.mongo.ts
  - src/infrastructure/di/inversify.config.ts
  - src/app/api/users/teams/route.ts
  - src/infrastructure/db/mongoose/schemas/profile.ts
  - src/app/api/teams/route.ts
  - src/components/team/index.tsx
  - AGENTS.md
  - src/components/layout/nav/links.tsx
  - src/infrastructure/di/types.ts
  - src/applications/usecases/team/create-team.usecase.ts
  - src/applications/usecases/user/link-pending-invitations.usecase.ts
  - src/applications/repositories/player.repository.interface.ts
  - src/infrastructure/db/repositories/base.repository.mongo.ts
  - src/entities/profile.ts
  - src/interface/controllers/team/team.controller.ts
  - src/lib/auth-hook.ts
tests:
  - src/components/team/__tests__/invitation-list.test.tsx
  - src/applications/usecases/player/__tests__/leave-team.usecase.test.ts
  - src/applications/errors/__tests__/app-error.test.ts
  - src/infrastructure/db/repositories/__tests__/player.repository.test.ts
  - src/lib/__tests__/auth-hook.test.ts
  - src/entities/__tests__/player.test.ts
  - src/applications/usecases/player/__tests__/cancel-invitation.usecase.test.ts
  - src/applications/usecases/player/__tests__/accept-invitation.usecase.test.ts
  - src/infrastructure/db/repositories/tests/__tests__/player.repository.test.ts
  - src/applications/usecases/user/__tests__/link-pending-invitations.usecase.test.ts
  - src/applications/usecases/player/__tests__/get-user-players.usecase.test.ts
  - src/applications/errors/__tests__/result.test.ts
  - src/applications/usecases/player/__tests__/reject-invitation.usecase.test.ts
  - src/applications/usecases/player/__tests__/create-invitation.usecase.test.ts
  - src/applications/usecases/user/__tests__/search-user.usecase.test.ts
  - src/applications/usecases/user/__tests__/create-profile.usecase.test.ts
  - src/lib/validations/__tests__/player.test.ts
  - src/applications/usecases/player/__tests__/create-player.usecase.test.ts
-->

### Requirement: User search by email

The system SHALL support searching for users by exact email match via `GET /api/users?email={email}` (Interface + Application layers). The endpoint SHALL require authentication.

#### Scenario: Search finds a registered user

- **WHEN** an authenticated user sends `GET /api/users?email=alice@example.com` and the email matches a registered user
- **THEN** the API SHALL respond with HTTP 200 and `{ _id, name, image }`
- **THEN** the response SHALL NOT include `email`, `emailVerified`, `createdAt`, `updatedAt`, or other sensitive fields

#### Scenario: Search finds no user

- **WHEN** an authenticated user sends `GET /api/users?email=unknown@example.com` and no user matches
- **THEN** the API SHALL respond with HTTP 404

#### Scenario: Unauthenticated request

- **WHEN** an unauthenticated client sends `GET /api/users?email=alice@example.com`
- **THEN** the API SHALL respond with HTTP 401

#### Scenario: Invalid email format

- **WHEN** an authenticated user sends `GET /api/users?email=not-an-email`
- **THEN** the API SHALL respond with HTTP 400 with a validation error

---
### Requirement: Backward-compatible self-lookup

When `GET /api/users` is called without query parameters, it SHALL return the current authenticated user's full profile (existing behavior preserved).

#### Scenario: Get current user without search params

- **WHEN** an authenticated user sends `GET /api/users` (no query params)
- **THEN** the API SHALL respond with the full user object (existing behavior)

---
### Requirement: Rate limiting for user search

The user search endpoint SHALL enforce rate limiting to prevent email enumeration attacks.

#### Scenario: Rate limit exceeded

- **WHEN** an authenticated user exceeds the rate limit for user search requests
- **THEN** the API SHALL respond with HTTP 429

---
### Requirement: User search controller routing

The `GET /api/users` route SHALL use a controller to dispatch between self-lookup (no params) and user search (with email param), following the existing API pattern: auth check → Zod validation → controller → use case → response.

#### Scenario: Route dispatches to search use case

- **WHEN** `GET /api/users?email=alice@example.com` is received
- **THEN** the route SHALL delegate to a SearchUserUseCase via the user controller
- **THEN** the use case SHALL query the User collection by exact email match