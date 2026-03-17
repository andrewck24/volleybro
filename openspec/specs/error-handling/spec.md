## ADDED Requirements

### Requirement: AppError class hierarchy

The system SHALL define an abstract `AppError` base class extending `Error`, with concrete subclasses for each error category. Each subclass SHALL expose a `code` string and an `isTransient` boolean (Application layer: shared types).

#### Scenario: AppError subclasses

- **WHEN** the error handling module is loaded
- **THEN** the following classes SHALL be available:
  - `NotFoundError` (code: `NOT_FOUND`, isTransient: false)
  - `ValidationError` (code: `VALIDATION`, isTransient: false)
  - `AuthorizationError` (code: `AUTHORIZATION`, isTransient: false)
  - `ConflictError` (code: `CONFLICT`, isTransient: false)
  - `TransientError` (code: `TRANSIENT`, isTransient: true)

#### Scenario: instanceof works correctly

- **WHEN** a `NotFoundError` is thrown or returned
- **THEN** `error instanceof NotFoundError` SHALL return true
- **THEN** `error instanceof AppError` SHALL return true
- **THEN** `error instanceof Error` SHALL return true


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

### Requirement: Result type definition

The system SHALL define a discriminated union `Result<T>` type for representing success or failure outcomes without throwing (Application layer: shared types).

#### Scenario: Success result

- **WHEN** an operation succeeds with value `42`
- **THEN** the result SHALL be `{ ok: true, value: 42 }`
- **THEN** accessing `result.ok` SHALL return `true`

#### Scenario: Failure result

- **WHEN** an operation fails with a NotFoundError
- **THEN** the result SHALL be `{ ok: false, error: NotFoundError }`
- **THEN** accessing `result.ok` SHALL return `false`
- **THEN** accessing `result.error.isTransient` SHALL return `false`


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

### Requirement: Mixed error handling pattern

Use cases in pilot scope SHALL use Result type for business logic outcomes. Infrastructure errors (database crashes, network failures) MAY still throw. Callers SHALL handle both patterns (Application layer convention).

#### Scenario: Use case returns Result for business error

- **WHEN** `LinkPendingInvitationsUseCase` encounters a database write failure
- **THEN** it SHALL catch the error and return `{ ok: false, error: TransientError }`

#### Scenario: Use case returns Result for success

- **WHEN** `CreateProfileUseCase` successfully creates a profile
- **THEN** it SHALL return `{ ok: true, value: <profile> }`


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

### Requirement: Pilot scope limitation

The Result pattern and AppError hierarchy SHALL be applied only to `LinkPendingInvitationsUseCase` and `CreateProfileUseCase` in this change. All other existing use cases SHALL continue using the current `throw new Error()` pattern until a dedicated migration change is created.

#### Scenario: Non-pilot use case unchanged

- **WHEN** `AcceptInvitationUseCase` encounters an error
- **THEN** it SHALL continue to `throw new Error(message)` (no change from current behavior)

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

### Requirement: AppError class hierarchy

The system SHALL define an abstract `AppError` base class extending `Error`, with concrete subclasses for each error category. Each subclass SHALL expose a `code` string and an `isTransient` boolean (Application layer: shared types).

#### Scenario: AppError subclasses

- **WHEN** the error handling module is loaded
- **THEN** the following classes SHALL be available:
  - `NotFoundError` (code: `NOT_FOUND`, isTransient: false)
  - `ValidationError` (code: `VALIDATION`, isTransient: false)
  - `AuthorizationError` (code: `AUTHORIZATION`, isTransient: false)
  - `ConflictError` (code: `CONFLICT`, isTransient: false)
  - `TransientError` (code: `TRANSIENT`, isTransient: true)

#### Scenario: instanceof works correctly

- **WHEN** a `NotFoundError` is thrown or returned
- **THEN** `error instanceof NotFoundError` SHALL return true
- **THEN** `error instanceof AppError` SHALL return true
- **THEN** `error instanceof Error` SHALL return true

---
### Requirement: Result type definition

The system SHALL define a discriminated union `Result<T>` type for representing success or failure outcomes without throwing (Application layer: shared types).

#### Scenario: Success result

- **WHEN** an operation succeeds with value `42`
- **THEN** the result SHALL be `{ ok: true, value: 42 }`
- **THEN** accessing `result.ok` SHALL return `true`

#### Scenario: Failure result

- **WHEN** an operation fails with a NotFoundError
- **THEN** the result SHALL be `{ ok: false, error: NotFoundError }`
- **THEN** accessing `result.ok` SHALL return `false`
- **THEN** accessing `result.error.isTransient` SHALL return `false`

---
### Requirement: Mixed error handling pattern

Use cases in pilot scope SHALL use Result type for business logic outcomes. Infrastructure errors (database crashes, network failures) MAY still throw. Callers SHALL handle both patterns (Application layer convention).

#### Scenario: Use case returns Result for business error

- **WHEN** `LinkPendingInvitationsUseCase` encounters a database write failure
- **THEN** it SHALL catch the error and return `{ ok: false, error: TransientError }`

#### Scenario: Use case returns Result for success

- **WHEN** `CreateProfileUseCase` successfully creates a profile
- **THEN** it SHALL return `{ ok: true, value: <profile> }`

---
### Requirement: Pilot scope limitation

The Result pattern and AppError hierarchy SHALL be applied only to `LinkPendingInvitationsUseCase` and `CreateProfileUseCase` in this change. All other existing use cases SHALL continue using the current `throw new Error()` pattern until a dedicated migration change is created.

#### Scenario: Non-pilot use case unchanged

- **WHEN** `AcceptInvitationUseCase` encounters an error
- **THEN** it SHALL continue to `throw new Error(message)` (no change from current behavior)