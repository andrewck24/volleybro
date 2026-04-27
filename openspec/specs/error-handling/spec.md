## Requirements

### Requirement: AppError class hierarchy

The system SHALL define an abstract `AppError` class extending `Error` in `src/entities/errors/app-error.ts` (Domain layer). Each instance SHALL expose the following fields:

- `code` (required, `AppErrorCode` enum): Error classification string
- `reason` (required, `string`): Domain-scoped enum value for precise discrimination
- `detail` (required, `string`): De-identified, stable, human-readable description — safe for HTTP responses and monitoring grouping
- `message` (inherited from `Error`): Internal-only string that can contain entity IDs for debugging — SHALL NOT be serialized to HTTP responses
- `httpStatus` (required, `number`): HTTP status code fixed per subclass
- `isTransient` (required, `boolean`): Whether the error represents a temporary failure

The constructor signature SHALL be `(reason: string, detail: string, internalMessage?: string)`. When `internalMessage` is omitted, `Error.message` SHALL default to the `detail` value.

The system SHALL provide exactly seven concrete subclasses of `AppError`:

| Class                 | code             | httpStatus | isTransient |
| --------------------- | ---------------- | ---------- | ----------- |
| `ValidationError`     | `VALIDATION`     | 400        | false       |
| `AuthenticationError` | `AUTHENTICATION` | 401        | false       |
| `AuthorizationError`  | `AUTHORIZATION`  | 403        | false       |
| `NotFoundError`       | `NOT_FOUND`      | 404        | false       |
| `ConflictError`       | `CONFLICT`       | 409        | false       |
| `TransientError`      | `TRANSIENT`      | 503        | true        |
| `UnexpectedError`     | `UNEXPECTED`     | 500        | false       |

#### Scenario: AppError constructor with internalMessage

- **WHEN** `new NotFoundError("PLAYER_NOT_FOUND", "The specified player does not exist", "Player 6721a not found in team abc")` is created
- **THEN** `error.reason` SHALL be `"PLAYER_NOT_FOUND"`
- **THEN** `error.detail` SHALL be `"The specified player does not exist"`
- **THEN** `error.message` SHALL be `"Player 6721a not found in team abc"`

#### Scenario: AppError constructor without internalMessage

- **WHEN** `new AuthenticationError("SESSION_REQUIRED", "Authentication is required")` is created
- **THEN** `error.message` SHALL be `"Authentication is required"` (defaults to detail)

#### Scenario: instanceof chain works correctly

- **WHEN** a `ConflictError` is thrown
- **THEN** `error instanceof ConflictError` SHALL return true
- **THEN** `error instanceof AppError` SHALL return true
- **THEN** `error instanceof Error` SHALL return true

---

### Requirement: AppErrorCode type union

The system SHALL define an `AppErrorCode` type as a union of string literals: `"VALIDATION" | "AUTHENTICATION" | "AUTHORIZATION" | "NOT_FOUND" | "CONFLICT" | "TRANSIENT" | "UNEXPECTED"`.

#### Scenario: AppErrorCode matches subclass codes

- **WHEN** each error subclass is instantiated
- **THEN** its `code` property SHALL be assignable to `AppErrorCode`

---

### Requirement: ValidationError with details field

`ValidationError` SHALL accept an optional `details` parameter (fourth argument) for carrying structured validation information such as Zod issue arrays. Other error subclasses SHALL NOT have a `details` field.

#### Scenario: ValidationError with Zod issues

- **WHEN** `new ValidationError("INVALID_INPUT", "Request data failed validation", undefined, zodError.issues)` is created
- **THEN** `error.details` SHALL contain the Zod issues array
- **THEN** `error.httpStatus` SHALL be `400`

#### Scenario: ValidationError without details

- **WHEN** `new ValidationError("INVALID_EMAIL", "Invalid email format")` is created
- **THEN** `error.details` SHALL be `undefined`

---

### Requirement: UnexpectedError with originalError field

`UnexpectedError` SHALL accept an optional `originalError` parameter for preserving the original caught error. This field SHALL be used for logging only and SHALL NOT be serialized to HTTP responses.

#### Scenario: UnexpectedError wrapping unknown error

- **WHEN** an unknown error is caught and wrapped as `new UnexpectedError("UNHANDLED_ERROR", "An unexpected error occurred", undefined, originalError)`
- **THEN** `error.originalError` SHALL reference the original error object
- **THEN** `error.httpStatus` SHALL be `500`

---

### Requirement: TransientError with source metadata

`TransientError` SHALL accept an optional `options` object with `source` (string identifying the failing infrastructure component) and `retryable` (boolean hint for callers). These fields SHALL be used for server-side logging and retry decisions only and SHALL NOT be serialized to HTTP responses.

#### Scenario: TransientError with database source

- **WHEN** `new TransientError("DATABASE_UNAVAILABLE", "Service temporarily unavailable", undefined, { source: "database", retryable: true })` is created
- **THEN** `error.source` SHALL be `"database"`
- **THEN** `error.retryable` SHALL be `true`
- **THEN** `error.httpStatus` SHALL be `503`

---

### Requirement: Domain-scoped reason enums

The system SHALL define reason enums grouped by domain entity in `src/entities/errors/reasons/`. Each domain entity that throws errors SHALL have a corresponding reason enum file. A shared `CommonReason` enum SHALL exist for cross-domain values.

Each enum value SHALL be an `UPPER_SNAKE_CASE` string. The `reason` field on `AppError` SHALL accept any of these enum values. Concrete enum values SHALL be determined during per-domain migration based on analysis of all error paths in that domain.

The `RecordReason` enum SHALL be renamed to `GameReason` and its file SHALL move from `src/entities/errors/reasons/record.ts` to `src/entities/errors/reasons/game.ts`. All references to `RecordReason` SHALL be updated to `GameReason`.

#### Scenario: Reason enum follows naming convention

- **WHEN** a new reason enum is created for a domain entity
- **THEN** the file SHALL be located at `src/entities/errors/reasons/<entity>.ts`
- **THEN** the enum SHALL be named `<Entity>Reason` (e.g., `PlayerReason`, `GameReason`)
- **THEN** all enum values SHALL use `UPPER_SNAKE_CASE` format

#### Scenario: CommonReason provides shared values

- **WHEN** an error reason is not specific to any single domain entity
- **THEN** it SHALL be defined in `CommonReason` at `src/entities/errors/reasons/common.ts`

<!-- @trace
source: type-decoupling
updated: 2026-04-08
code:
  - src/interface/controllers/player/invitation.controller.ts
  - src/infrastructure/db/mongoose/schemas/game.ts
  - src/components/game/set-options/index.tsx
  - src/applications/usecases/player/leave-team.usecase.ts
  - src/interface/controllers/team/team.controller.ts
  - .changeset/changelog-postprocess.cjs
  - src/applications/usecases/game/update-rally.usecase.ts
  - public/landing/features/game-demo-1-dark.png
  - src/applications/usecases/player/get-player.usecase.interface.ts
  - src/components/game/overview-header/index.tsx
  - src/components/game/panel/moves/ours.tsx
  - src/components/record/options/overview/index.tsx
  - src/lib/features/game/helpers/queries/previous-scores.helper.ts
  - src/app/api/games/[gameId]/sets/route.ts
  - src/lib/features/game/actions/create-substitution.ts
  - src/applications/usecases/record/set.usecase.ts
  - src/entities/game.ts
  - src/components/record/set-options/panel/options.tsx
  - src/lib/features/record/helpers/queries/serving-status.helper.ts
  - docs/architecture.md
  - src/entities/player.ts
  - src/interface/controllers/player/membership.controller.ts
  - src/applications/usecases/user/link-pending-invitations.usecase.ts
  - src/components/game/court.tsx
  - public/landing/features/game-demo-2-dark.png
  - src/components/match/sets/list.tsx
  - src/lib/features/record/actions/update-rally.ts
  - AGENTS.md
  - src/components/game/new/index.tsx
  - src/app/game/[gameId]/sets/[setIndex]/entry/layout.tsx
  - src/lib/features/record/helpers/index.ts
  - src/lib/scoring-moves.ts
  - src/components/landing/features/analytics.tsx
  - src/components/game/stats/teams-stats/item.tsx
  - src/components/match/header/index.tsx
  - src/components/game/options/index.tsx
  - src/components/record/entry/rally.tsx
  - src/applications/usecases/player/get-team-players.usecase.interface.ts
  - src/components/game/banner/teams.tsx
  - src/components/record/header/index.tsx
  - src/components/team/info/index.tsx
  - src/components/team/players/list.tsx
  - src/entities/record.ts
  - src/infrastructure/services/auth/authentication.service.ts
  - src/components/game/entry/substitution.tsx
  - src/components/landing/highlights.tsx
  - src/entities/team.ts
  - src/interface/controllers/game/substitution.controller.ts
  - src/applications/repositories/team.repository.interface.ts
  - src/applications/usecases/game/create-rally.usecase.ts
  - src/applications/repositories/game.repository.interface.ts
  - src/components/user/invitations/index.tsx
  - src/lib/features/record/helpers/optimistic/rally.helper.ts
  - src/applications/usecases/game/update-set.usecase.ts
  - src/applications/usecases/team/create-team.usecase.interface.ts
  - src/components/match/banner/index.tsx
  - src/applications/usecases/player/create-player.usecase.interface.ts
  - src/components/home/index.tsx
  - src/entities/errors/reasons/record.ts
  - src/lib/features/team/hooks/use-replace-position.ts
  - src/components/game/panel/substitutes/index.tsx
  - src/components/match/stats/teams-stats/item.tsx
  - src/entities/errors/index.ts
  - src/components/game/banner/scores.tsx
  - src/applications/usecases/player/cancel-invitation.usecase.ts
  - src/components/game/stats/index.tsx
  - src/lib/features/game/actions/create-rally.ts
  - src/components/match/banner/scores.tsx
  - src/app/match/[recordId]/sets/page.tsx
  - src/components/record/set-options/index.tsx
  - src/applications/usecases/team/create-team.usecase.ts
  - src/applications/usecases/game/find-game.usecase.ts
  - src/app/record/[recordId]/page.tsx
  - src/components/game/new/info-form.tsx
  - src/components/team/lineup/panel/options/index.tsx
  - src/components/record/new/index.tsx
  - src/infrastructure/db/mongoose/schemas/team.ts
  - src/lib/features/game/game-slice.ts
  - src/lib/features/game/helpers/optimistic/substitution.helper.ts
  - src/app/api/records/[recordId]/route.ts
  - src/components/record/panel/moves/index.tsx
  - src/components/team/lineup/panel/substitutes.tsx
  - src/entities/errors/reasons/player.ts
  - src/components/record/index.tsx
  - src/components/team/lineup/panel/player-info.tsx
  - src/components/record/set-options/panel/substitutes.tsx
  - src/components/game/index.tsx
  - src/lib/features/game/helpers/index.ts
  - src/app/game/[gameId]/sets/[setIndex]/entry/page.tsx
  - src/app/match/[recordId]/page.tsx
  - src/app/game/[gameId]/sets/page.tsx
  - src/applications/usecases/player/get-team-players.usecase.ts
  - src/infrastructure/db/mongoose/schemas/record.ts
  - src/lib/auth-hook.ts
  - src/applications/repositories/base.repository.interface.ts
  - src/lib/features/record/helpers/optimistic/substitution.helper.ts
  - src/applications/usecases/player/get-user-players.usecase.interface.ts
  - src/applications/usecases/player/index.ts
  - src/components/record/panel/substitutes/index.tsx
  - src/components/landing/features/game.tsx
  - src/lib/features/record/helpers/queries/previous-rally.helper.ts
  - src/applications/usecases/player/reject-invitation.usecase.interface.ts
  - src/components/record/panel/index.tsx
  - src/components/home/game-history.tsx
  - src/lib/features/game/hooks/use-lineup.ts
  - src/components/game/new/roster-list.tsx
  - src/applications/usecases/user/get-user-by-id.usecase.ts
  - src/applications/usecases/player/update-player-info.usecase.ts
  - src/components/record/new/roster-list.tsx
  - src/lib/features/game/helpers/queries/serving-status.helper.ts
  - src/components/custom/court/index.tsx
  - src/components/game/header/index.tsx
  - src/components/match/stats/index.tsx
  - src/applications/usecases/player/transfer-ownership.usecase.ts
  - src/applications/usecases/user/profile.usecase.ts
  - src/components/game/sets/list.tsx
  - src/infrastructure/db/repositories/team.repository.mongo.ts
  - src/infrastructure/di/inversify.config.ts
  - src/components/record/preview.tsx
  - src/applications/usecases/player/transfer-ownership.usecase.interface.ts
  - src/interface/controllers/record/rally.controller.ts
  - src/components/record/header/scores.tsx
  - src/lib/features/game/hooks/use-substitutes.ts
  - README.md
  - src/app/match/[recordId]/layout.tsx
  - src/applications/usecases/player/remove-player.usecase.ts
  - src/components/match/sets/edit.tsx
  - src/components/record/options/index.tsx
  - src/applications/usecases/player/get-player.usecase.ts
  - src/components/game/set-options/panel/substitutes.tsx
  - src/components/team/players/edit-form.tsx
  - src/components/game/entry/index.tsx
  - src/app/api/matches/route.ts
  - src/app/api/records/[recordId]/sets/substitutions/route.ts
  - src/applications/repositories/profile.repository.interface.ts
  - src/app/api/records/route.ts
  - src/components/record/entry/substitution.tsx
  - src/app/api/games/[gameId]/sets/substitutions/route.ts
  - src/applications/usecases/user/search-user.usecase.ts
  - src/components/record/panel/moves/oppo.tsx
  - src/app/api/games/route.ts
  - src/components/game/set-options/panel/index.tsx
  - src/app/api/records/[recordId]/sets/route.ts
  - src/components/game/stats/teams-stats/points.tsx
  - src/app/record/layout.tsx
  - src/applications/repositories/player.repository.interface.ts
  - src/applications/usecases/record/rally.usecase.ts
  - src/lib/features/record/record-slice.ts
  - src/app/api/players/[playerId]/route.ts
  - src/app/game/[gameId]/page.tsx
  - src/applications/usecases/player/get-user-players.usecase.ts
  - src/components/record/panel/moves/ours.tsx
  - src/interface/controllers/game/set.controller.ts
  - src/hooks/use-data.ts
  - src/entities/errors/reasons/game.ts
  - src/app/api/games/[gameId]/sets/rallies/route.ts
  - src/components/team/players/info.tsx
  - src/infrastructure/db/repositories/user.repository.mongo.ts
  - src/components/record/options/summary.tsx
  - src/app/game/layout.tsx
  - src/components/game/options/edit/index.tsx
  - public/landing/features/game-demo-2-light.png
  - src/entities/profile.ts
  - src/lib/features/game/helpers/optimistic/rally.helper.ts
  - src/infrastructure/di/types.ts
  - src/components/team/lineup/panel/index.tsx
  - src/applications/usecases/player/create-invitation.usecase.interface.ts
  - src/components/game/match.tsx
  - src/app/api/teams/[teamId]/players/route.ts
  - src/app/api/players/[playerId]/memberships/route.ts
  - src/components/record/options/edit/index.tsx
  - src/components/game/options/summary.tsx
  - src/components/game/options/overview/index.tsx
  - src/applications/usecases/player/create-player.usecase.ts
  - src/components/game/panel/moves/index.tsx
  - src/lib/features/record/helpers/queries/previous-scores.helper.ts
  - src/components/record/set-options/panel/index.tsx
  - src/lib/api/error-toast.ts
  - src/applications/usecases/player/leave-team.usecase.interface.ts
  - src/lib/features/record/hooks/use-lineup.ts
  - src/infrastructure/db/repositories/player.repository.mongo.ts
  - src/applications/repositories/user.repository.interface.ts
  - src/applications/usecases/player/reject-invitation.usecase.ts
  - src/components/game/sets/edit.tsx
  - src/components/record/new/info-form.tsx
  - src/interface/controllers/player/player.controller.ts
  - src/lib/redux/store.ts
  - src/components/layout/nav/action-button.tsx
  - src/app/api/players/[playerId]/invitations/route.ts
  - src/components/landing/features/index.tsx
  - src/interface/controllers/game/rally.controller.ts
  - public/landing/features/game-demo-1-light.png
  - src/interface/controllers/record/substitution.controller.ts
  - src/components/user/menu/index.tsx
  - src/interface/controllers/record/record.controller.ts
  - src/app/api/users/route.ts
  - src/applications/usecases/record/matches.usecase.ts
  - src/components/game/panel/moves/oppo.tsx
  - src/components/match/banner/teams.tsx
  - docs/maintenance-policy.md
  - src/components/game/header/scores.tsx
  - src/components/team/players/membership-section.tsx
  - src/entities/user.ts
  - src/lib/validations/player.ts
  - src/applications/usecases/player/accept-invitation.usecase.ts
  - src/applications/usecases/record/record.usecase.ts
  - src/applications/usecases/game/create-game.usecase.ts
  - src/applications/usecases/player/cancel-invitation.usecase.interface.ts
  - src/components/record/entry/index.tsx
  - src/lib/features/record/helpers/queries/match-phase.helper.ts
  - src/app/api/users/[userId]/players/route.ts
  - src/components/record/match.tsx
  - src/interface/controllers/player/ownership.controller.ts
  - src/applications/repositories/record.repository.interface.ts
  - src/infrastructure/db/repositories/repository-helpers.mongo.ts
  - src/app/api/records/[recordId]/sets/rallies/route.ts
  - src/components/game/stats/teams-stats/index.tsx
  - src/applications/usecases/player/accept-invitation.usecase.interface.ts
  - src/applications/usecases/player/update-player-info.usecase.interface.ts
  - src/lib/features/game/helpers/queries/game-phase.helper.ts
  - src/components/team/lineup/court.tsx
  - src/components/game/sets/index.tsx
  - src/components/game/entry/rally.tsx
  - src/infrastructure/db/repositories/base.repository.mongo.ts
  - src/lib/features/team/types.ts
  - CLAUDE.md
  - src/lib/features/record/types.ts
  - src/components/game/banner/index.tsx
  - src/infrastructure/db/repositories/record.repository.mongo.ts
  - src/lib/features/record/hooks/use-substitutes.ts
  - GEMINI.md
  - src/applications/usecases/player/update-role.usecase.ts
  - src/components/match/sets/index.tsx
  - src/interface/controllers/user/user.controller.ts
  - src/lib/features/game/types.ts
  - src/lib/features/team/lineup-slice.ts
  - src/infrastructure/db/repositories/profile.repository.mongo.ts
  - src/interface/controllers/game/game.controller.ts
  - src/app/api/games/[gameId]/route.ts
  - src/lib/features/record/actions/create-substitution.ts
  - src/components/landing/features/recording.tsx
  - src/components/game/panel/index.tsx
  - src/components/game/preview.tsx
  - src/components/match/stats/teams-stats/points.tsx
  - src/components/match/stats/teams-stats/index.tsx
  - src/interface/controllers/game/game-summary.controller.ts
  - src/lib/features/record/actions/create-rally.ts
  - src/components/record/court.tsx
  - src/components/game/set-options/panel/options.tsx
  - src/applications/usecases/player/update-role.usecase.interface.ts
  - src/components/game/overview.tsx
  - src/components/match/index.tsx
  - src/applications/usecases/player/create-invitation.usecase.ts
  - src/app/api/teams/route.ts
  - src/infrastructure/db/repositories/game.repository.mongo.ts
  - src/lib/features/game/actions/update-rally.ts
  - src/stories/custom/court.stories.tsx
  - src/applications/usecases/game/create-set.usecase.ts
  - src/components/team/lineup/index.tsx
  - src/applications/usecases/record/substitution.usecase.ts
  - src/applications/usecases/player/remove-player.usecase.interface.ts
  - src/app/(protected)/team/new/page.jsx
  - src/applications/usecases/game/find-game-summaries.usecase.ts
  - src/components/home/matches.tsx
  - src/applications/usecases/game/create-substitution.usecase.ts
  - src/infrastructure/db/repositories/index.ts
  - src/interface/controllers/record/match.controller.ts
  - src/interface/controllers/record/set.controller.ts
  - src/lib/features/game/helpers/queries/previous-rally.helper.ts
  - CONTRIBUTING.md
  - src/app/api/teams/[teamId]/ownership/route.ts
tests:
  - src/lib/features/record/helpers/optimistic/test/rally.helper.test.ts
  - src/app/api/teams/[teamId]/players/__tests__/route.test.ts
  - src/components/landing/__tests__/features.test.tsx
  - src/infrastructure/db/repositories/__tests__/repository-helpers.test.ts
  - src/lib/features/game/helpers/queries/tests/game-phase.helper.test.ts
  - src/__tests__/helpers/mock-repositories.ts
  - src/app/api/teams/[teamId]/ownership/__tests__/route.test.ts
  - src/app/api/teams/[teamId]/players/__tests__/get-route.test.ts
  - src/app/api/players/[playerId]/__tests__/update-info.test.ts
  - src/components/game/__tests__/set-options-panel.test.tsx
  - src/infrastructure/db/repositories/__tests__/base.repository.error-translation.test.ts
  - src/infrastructure/db/repositories/__tests__/player.repository.test.ts
  - src/lib/features/game/helpers/optimistic/test/substitution.helper.test.ts
  - src/entities/__tests__/record.test.ts
  - src/lib/features/record/helpers/queries/tests/previous-scores.helper.test.ts
  - src/applications/usecases/game/__tests__/find-game.usecase.test.ts
  - src/infrastructure/db/repositories/__tests__/record.repository.test.ts
  - src/applications/usecases/player/__tests__/accept-invitation.usecase.test.ts
  - src/applications/usecases/record/__tests__/record-errors.test.ts
  - src/applications/usecases/game/__tests__/create-rally.usecase.test.ts
  - src/infrastructure/services/auth/__tests__/authentication.service.test.ts
  - src/lib/features/record/helpers/queries/tests/previous-rally.helper.test.ts
  - src/app/api/games/__tests__/route.test.ts
  - src/applications/usecases/player/__tests__/get-user-players.usecase.test.ts
  - src/components/record/__tests__/set-options-panel.test.tsx
  - src/lib/features/game/helpers/optimistic/test/rally.helper.test.ts
  - src/lib/features/record/helpers/queries/tests/serving-status.helper.test.ts
  - src/applications/usecases/player/__tests__/update-player-info.usecase.test.ts
  - src/applications/usecases/user/__tests__/link-pending-invitations.usecase.test.ts
  - src/applications/usecases/team/__tests__/create-team.usecase.test.ts
  - src/lib/features/game/helpers/queries/tests/previous-rally.helper.test.ts
  - src/components/user/__tests__/invitations.test.tsx
  - src/applications/usecases/player/__tests__/cancel-invitation.usecase.test.ts
  - src/app/api/players/[playerId]/invitations/__tests__/route.test.ts
  - src/app/api/players/[playerId]/memberships/__tests__/route.test.ts
  - src/infrastructure/db/repositories/__tests__/team.repository.test.ts
  - src/lib/__tests__/auth-hook.test.ts
  - src/lib/features/record/helpers/queries/tests/match-phase.helper.test.ts
  - src/applications/usecases/player/__tests__/create-player.usecase.test.ts
  - src/lib/features/record/helpers/optimistic/test/substitution.helper.test.ts
  - src/applications/usecases/game/__tests__/create-set.usecase.test.ts
  - src/applications/usecases/player/__tests__/transfer-ownership.usecase.test.ts
  - src/app/api/users/[userId]/players/__tests__/route.test.ts
  - src/infrastructure/db/repositories/__tests__/user.repository.test.ts
  - src/lib/features/game/helpers/queries/tests/serving-status.helper.test.ts
  - src/__tests__/helpers/mock-mongoose.ts
  - src/applications/usecases/player/__tests__/reject-invitation.usecase.test.ts
  - src/components/landing/__tests__/highlights.test.tsx
  - src/lib/features/game/helpers/queries/tests/previous-scores.helper.test.ts
  - src/applications/usecases/user/__tests__/search-user.usecase.test.ts
  - src/infrastructure/services/auth/__tests__/authorization.service.test.ts
  - src/__tests__/helpers/fixtures.ts
  - src/components/team/__tests__/membership-section-loading.test.tsx
  - src/applications/usecases/game/__tests__/update-rally.usecase.test.ts
  - src/applications/usecases/player/__tests__/create-invitation.usecase.test.ts
  - src/applications/usecases/player/__tests__/get-team-players.usecase.test.ts
  - src/applications/usecases/player/__tests__/leave-team.usecase.test.ts
  - src/app/api/players/[playerId]/__tests__/route.test.ts
  - src/entities/__tests__/player.test.ts
  - src/lib/validations/__tests__/player.test.ts
  - src/components/team/__tests__/team-info-error-state.test.tsx
  - src/app/api/teams/[teamId]/players/__tests__/create-player.test.ts
  - src/applications/usecases/game/__tests__/update-set.usecase.test.ts
  - src/applications/usecases/player/__tests__/remove-player.usecase.test.ts
  - src/applications/usecases/player/__tests__/get-player.usecase.test.ts
  - src/infrastructure/db/repositories/__tests__/game.repository.test.ts
  - src/applications/usecases/user/__tests__/create-profile.usecase.test.ts
  - src/applications/usecases/player/__tests__/update-role.usecase.test.ts
  - src/__tests__/helpers/index.ts
  - src/applications/usecases/game/__tests__/create-substitution.usecase.test.ts
  - src/entities/__tests__/game.test.ts
-->

---

### Requirement: Only AppError subclasses shall be thrown

All application code (use cases, services, repositories) SHALL throw only `AppError` subclasses. Throwing `new Error("message")` directly SHALL be prohibited. Infrastructure layers SHALL catch external library errors (Mongoose, Better Auth) and translate them into the appropriate `AppError` subclass before re-throwing.

Every public method on a Mongoose repository implementation SHALL wrap its body in a try-catch block that calls `translateRepositoryError()` on caught errors. This applies to both methods inherited from `BaseMongoRepository` and custom methods defined directly on the repository class. No raw Mongoose error SHALL propagate past the repository boundary.

#### Scenario: Use case throws typed error

- **WHEN** a use case detects a domain error condition
- **THEN** it SHALL throw an `AppError` subclass with an appropriate `reason` and `detail`
- **THEN** it SHALL NOT throw `new Error("message")`

#### Scenario: Infrastructure translates Mongoose errors

- **WHEN** a Mongoose `CastError` is thrown during a repository operation
- **THEN** the repository SHALL catch it and throw a `NotFoundError`

#### Scenario: Infrastructure translates duplicate key errors

- **WHEN** a Mongoose `MongoServerError` with code 11000 is thrown during a repository operation
- **THEN** the repository SHALL catch it and throw a `ConflictError` with the appropriate domain reason

#### Scenario: Infrastructure translates connection errors

- **WHEN** a Mongoose connection or timeout error is thrown during a repository operation
- **THEN** the repository SHALL catch it and throw a `TransientError` with `source: "database"`

#### Scenario: Custom repository method translates errors

- **WHEN** a custom repository method (e.g., `PlayerRepositoryImpl.findTeamOwner()`, `GameRepositoryImpl.findGameSummaries()`) encounters a Mongoose error
- **THEN** the method SHALL catch the error and call `translateRepositoryError()` before re-throwing
- **THEN** the raw Mongoose error SHALL NOT propagate to the use case layer

<!-- @trace
source: type-decoupling
updated: 2026-04-08
code:
  - src/interface/controllers/player/invitation.controller.ts
  - src/infrastructure/db/mongoose/schemas/game.ts
  - src/components/game/set-options/index.tsx
  - src/applications/usecases/player/leave-team.usecase.ts
  - src/interface/controllers/team/team.controller.ts
  - .changeset/changelog-postprocess.cjs
  - src/applications/usecases/game/update-rally.usecase.ts
  - public/landing/features/game-demo-1-dark.png
  - src/applications/usecases/player/get-player.usecase.interface.ts
  - src/components/game/overview-header/index.tsx
  - src/components/game/panel/moves/ours.tsx
  - src/components/record/options/overview/index.tsx
  - src/lib/features/game/helpers/queries/previous-scores.helper.ts
  - src/app/api/games/[gameId]/sets/route.ts
  - src/lib/features/game/actions/create-substitution.ts
  - src/applications/usecases/record/set.usecase.ts
  - src/entities/game.ts
  - src/components/record/set-options/panel/options.tsx
  - src/lib/features/record/helpers/queries/serving-status.helper.ts
  - docs/architecture.md
  - src/entities/player.ts
  - src/interface/controllers/player/membership.controller.ts
  - src/applications/usecases/user/link-pending-invitations.usecase.ts
  - src/components/game/court.tsx
  - public/landing/features/game-demo-2-dark.png
  - src/components/match/sets/list.tsx
  - src/lib/features/record/actions/update-rally.ts
  - AGENTS.md
  - src/components/game/new/index.tsx
  - src/app/game/[gameId]/sets/[setIndex]/entry/layout.tsx
  - src/lib/features/record/helpers/index.ts
  - src/lib/scoring-moves.ts
  - src/components/landing/features/analytics.tsx
  - src/components/game/stats/teams-stats/item.tsx
  - src/components/match/header/index.tsx
  - src/components/game/options/index.tsx
  - src/components/record/entry/rally.tsx
  - src/applications/usecases/player/get-team-players.usecase.interface.ts
  - src/components/game/banner/teams.tsx
  - src/components/record/header/index.tsx
  - src/components/team/info/index.tsx
  - src/components/team/players/list.tsx
  - src/entities/record.ts
  - src/infrastructure/services/auth/authentication.service.ts
  - src/components/game/entry/substitution.tsx
  - src/components/landing/highlights.tsx
  - src/entities/team.ts
  - src/interface/controllers/game/substitution.controller.ts
  - src/applications/repositories/team.repository.interface.ts
  - src/applications/usecases/game/create-rally.usecase.ts
  - src/applications/repositories/game.repository.interface.ts
  - src/components/user/invitations/index.tsx
  - src/lib/features/record/helpers/optimistic/rally.helper.ts
  - src/applications/usecases/game/update-set.usecase.ts
  - src/applications/usecases/team/create-team.usecase.interface.ts
  - src/components/match/banner/index.tsx
  - src/applications/usecases/player/create-player.usecase.interface.ts
  - src/components/home/index.tsx
  - src/entities/errors/reasons/record.ts
  - src/lib/features/team/hooks/use-replace-position.ts
  - src/components/game/panel/substitutes/index.tsx
  - src/components/match/stats/teams-stats/item.tsx
  - src/entities/errors/index.ts
  - src/components/game/banner/scores.tsx
  - src/applications/usecases/player/cancel-invitation.usecase.ts
  - src/components/game/stats/index.tsx
  - src/lib/features/game/actions/create-rally.ts
  - src/components/match/banner/scores.tsx
  - src/app/match/[recordId]/sets/page.tsx
  - src/components/record/set-options/index.tsx
  - src/applications/usecases/team/create-team.usecase.ts
  - src/applications/usecases/game/find-game.usecase.ts
  - src/app/record/[recordId]/page.tsx
  - src/components/game/new/info-form.tsx
  - src/components/team/lineup/panel/options/index.tsx
  - src/components/record/new/index.tsx
  - src/infrastructure/db/mongoose/schemas/team.ts
  - src/lib/features/game/game-slice.ts
  - src/lib/features/game/helpers/optimistic/substitution.helper.ts
  - src/app/api/records/[recordId]/route.ts
  - src/components/record/panel/moves/index.tsx
  - src/components/team/lineup/panel/substitutes.tsx
  - src/entities/errors/reasons/player.ts
  - src/components/record/index.tsx
  - src/components/team/lineup/panel/player-info.tsx
  - src/components/record/set-options/panel/substitutes.tsx
  - src/components/game/index.tsx
  - src/lib/features/game/helpers/index.ts
  - src/app/game/[gameId]/sets/[setIndex]/entry/page.tsx
  - src/app/match/[recordId]/page.tsx
  - src/app/game/[gameId]/sets/page.tsx
  - src/applications/usecases/player/get-team-players.usecase.ts
  - src/infrastructure/db/mongoose/schemas/record.ts
  - src/lib/auth-hook.ts
  - src/applications/repositories/base.repository.interface.ts
  - src/lib/features/record/helpers/optimistic/substitution.helper.ts
  - src/applications/usecases/player/get-user-players.usecase.interface.ts
  - src/applications/usecases/player/index.ts
  - src/components/record/panel/substitutes/index.tsx
  - src/components/landing/features/game.tsx
  - src/lib/features/record/helpers/queries/previous-rally.helper.ts
  - src/applications/usecases/player/reject-invitation.usecase.interface.ts
  - src/components/record/panel/index.tsx
  - src/components/home/game-history.tsx
  - src/lib/features/game/hooks/use-lineup.ts
  - src/components/game/new/roster-list.tsx
  - src/applications/usecases/user/get-user-by-id.usecase.ts
  - src/applications/usecases/player/update-player-info.usecase.ts
  - src/components/record/new/roster-list.tsx
  - src/lib/features/game/helpers/queries/serving-status.helper.ts
  - src/components/custom/court/index.tsx
  - src/components/game/header/index.tsx
  - src/components/match/stats/index.tsx
  - src/applications/usecases/player/transfer-ownership.usecase.ts
  - src/applications/usecases/user/profile.usecase.ts
  - src/components/game/sets/list.tsx
  - src/infrastructure/db/repositories/team.repository.mongo.ts
  - src/infrastructure/di/inversify.config.ts
  - src/components/record/preview.tsx
  - src/applications/usecases/player/transfer-ownership.usecase.interface.ts
  - src/interface/controllers/record/rally.controller.ts
  - src/components/record/header/scores.tsx
  - src/lib/features/game/hooks/use-substitutes.ts
  - README.md
  - src/app/match/[recordId]/layout.tsx
  - src/applications/usecases/player/remove-player.usecase.ts
  - src/components/match/sets/edit.tsx
  - src/components/record/options/index.tsx
  - src/applications/usecases/player/get-player.usecase.ts
  - src/components/game/set-options/panel/substitutes.tsx
  - src/components/team/players/edit-form.tsx
  - src/components/game/entry/index.tsx
  - src/app/api/matches/route.ts
  - src/app/api/records/[recordId]/sets/substitutions/route.ts
  - src/applications/repositories/profile.repository.interface.ts
  - src/app/api/records/route.ts
  - src/components/record/entry/substitution.tsx
  - src/app/api/games/[gameId]/sets/substitutions/route.ts
  - src/applications/usecases/user/search-user.usecase.ts
  - src/components/record/panel/moves/oppo.tsx
  - src/app/api/games/route.ts
  - src/components/game/set-options/panel/index.tsx
  - src/app/api/records/[recordId]/sets/route.ts
  - src/components/game/stats/teams-stats/points.tsx
  - src/app/record/layout.tsx
  - src/applications/repositories/player.repository.interface.ts
  - src/applications/usecases/record/rally.usecase.ts
  - src/lib/features/record/record-slice.ts
  - src/app/api/players/[playerId]/route.ts
  - src/app/game/[gameId]/page.tsx
  - src/applications/usecases/player/get-user-players.usecase.ts
  - src/components/record/panel/moves/ours.tsx
  - src/interface/controllers/game/set.controller.ts
  - src/hooks/use-data.ts
  - src/entities/errors/reasons/game.ts
  - src/app/api/games/[gameId]/sets/rallies/route.ts
  - src/components/team/players/info.tsx
  - src/infrastructure/db/repositories/user.repository.mongo.ts
  - src/components/record/options/summary.tsx
  - src/app/game/layout.tsx
  - src/components/game/options/edit/index.tsx
  - public/landing/features/game-demo-2-light.png
  - src/entities/profile.ts
  - src/lib/features/game/helpers/optimistic/rally.helper.ts
  - src/infrastructure/di/types.ts
  - src/components/team/lineup/panel/index.tsx
  - src/applications/usecases/player/create-invitation.usecase.interface.ts
  - src/components/game/match.tsx
  - src/app/api/teams/[teamId]/players/route.ts
  - src/app/api/players/[playerId]/memberships/route.ts
  - src/components/record/options/edit/index.tsx
  - src/components/game/options/summary.tsx
  - src/components/game/options/overview/index.tsx
  - src/applications/usecases/player/create-player.usecase.ts
  - src/components/game/panel/moves/index.tsx
  - src/lib/features/record/helpers/queries/previous-scores.helper.ts
  - src/components/record/set-options/panel/index.tsx
  - src/lib/api/error-toast.ts
  - src/applications/usecases/player/leave-team.usecase.interface.ts
  - src/lib/features/record/hooks/use-lineup.ts
  - src/infrastructure/db/repositories/player.repository.mongo.ts
  - src/applications/repositories/user.repository.interface.ts
  - src/applications/usecases/player/reject-invitation.usecase.ts
  - src/components/game/sets/edit.tsx
  - src/components/record/new/info-form.tsx
  - src/interface/controllers/player/player.controller.ts
  - src/lib/redux/store.ts
  - src/components/layout/nav/action-button.tsx
  - src/app/api/players/[playerId]/invitations/route.ts
  - src/components/landing/features/index.tsx
  - src/interface/controllers/game/rally.controller.ts
  - public/landing/features/game-demo-1-light.png
  - src/interface/controllers/record/substitution.controller.ts
  - src/components/user/menu/index.tsx
  - src/interface/controllers/record/record.controller.ts
  - src/app/api/users/route.ts
  - src/applications/usecases/record/matches.usecase.ts
  - src/components/game/panel/moves/oppo.tsx
  - src/components/match/banner/teams.tsx
  - docs/maintenance-policy.md
  - src/components/game/header/scores.tsx
  - src/components/team/players/membership-section.tsx
  - src/entities/user.ts
  - src/lib/validations/player.ts
  - src/applications/usecases/player/accept-invitation.usecase.ts
  - src/applications/usecases/record/record.usecase.ts
  - src/applications/usecases/game/create-game.usecase.ts
  - src/applications/usecases/player/cancel-invitation.usecase.interface.ts
  - src/components/record/entry/index.tsx
  - src/lib/features/record/helpers/queries/match-phase.helper.ts
  - src/app/api/users/[userId]/players/route.ts
  - src/components/record/match.tsx
  - src/interface/controllers/player/ownership.controller.ts
  - src/applications/repositories/record.repository.interface.ts
  - src/infrastructure/db/repositories/repository-helpers.mongo.ts
  - src/app/api/records/[recordId]/sets/rallies/route.ts
  - src/components/game/stats/teams-stats/index.tsx
  - src/applications/usecases/player/accept-invitation.usecase.interface.ts
  - src/applications/usecases/player/update-player-info.usecase.interface.ts
  - src/lib/features/game/helpers/queries/game-phase.helper.ts
  - src/components/team/lineup/court.tsx
  - src/components/game/sets/index.tsx
  - src/components/game/entry/rally.tsx
  - src/infrastructure/db/repositories/base.repository.mongo.ts
  - src/lib/features/team/types.ts
  - CLAUDE.md
  - src/lib/features/record/types.ts
  - src/components/game/banner/index.tsx
  - src/infrastructure/db/repositories/record.repository.mongo.ts
  - src/lib/features/record/hooks/use-substitutes.ts
  - GEMINI.md
  - src/applications/usecases/player/update-role.usecase.ts
  - src/components/match/sets/index.tsx
  - src/interface/controllers/user/user.controller.ts
  - src/lib/features/game/types.ts
  - src/lib/features/team/lineup-slice.ts
  - src/infrastructure/db/repositories/profile.repository.mongo.ts
  - src/interface/controllers/game/game.controller.ts
  - src/app/api/games/[gameId]/route.ts
  - src/lib/features/record/actions/create-substitution.ts
  - src/components/landing/features/recording.tsx
  - src/components/game/panel/index.tsx
  - src/components/game/preview.tsx
  - src/components/match/stats/teams-stats/points.tsx
  - src/components/match/stats/teams-stats/index.tsx
  - src/interface/controllers/game/game-summary.controller.ts
  - src/lib/features/record/actions/create-rally.ts
  - src/components/record/court.tsx
  - src/components/game/set-options/panel/options.tsx
  - src/applications/usecases/player/update-role.usecase.interface.ts
  - src/components/game/overview.tsx
  - src/components/match/index.tsx
  - src/applications/usecases/player/create-invitation.usecase.ts
  - src/app/api/teams/route.ts
  - src/infrastructure/db/repositories/game.repository.mongo.ts
  - src/lib/features/game/actions/update-rally.ts
  - src/stories/custom/court.stories.tsx
  - src/applications/usecases/game/create-set.usecase.ts
  - src/components/team/lineup/index.tsx
  - src/applications/usecases/record/substitution.usecase.ts
  - src/applications/usecases/player/remove-player.usecase.interface.ts
  - src/app/(protected)/team/new/page.jsx
  - src/applications/usecases/game/find-game-summaries.usecase.ts
  - src/components/home/matches.tsx
  - src/applications/usecases/game/create-substitution.usecase.ts
  - src/infrastructure/db/repositories/index.ts
  - src/interface/controllers/record/match.controller.ts
  - src/interface/controllers/record/set.controller.ts
  - src/lib/features/game/helpers/queries/previous-rally.helper.ts
  - CONTRIBUTING.md
  - src/app/api/teams/[teamId]/ownership/route.ts
tests:
  - src/lib/features/record/helpers/optimistic/test/rally.helper.test.ts
  - src/app/api/teams/[teamId]/players/__tests__/route.test.ts
  - src/components/landing/__tests__/features.test.tsx
  - src/infrastructure/db/repositories/__tests__/repository-helpers.test.ts
  - src/lib/features/game/helpers/queries/tests/game-phase.helper.test.ts
  - src/__tests__/helpers/mock-repositories.ts
  - src/app/api/teams/[teamId]/ownership/__tests__/route.test.ts
  - src/app/api/teams/[teamId]/players/__tests__/get-route.test.ts
  - src/app/api/players/[playerId]/__tests__/update-info.test.ts
  - src/components/game/__tests__/set-options-panel.test.tsx
  - src/infrastructure/db/repositories/__tests__/base.repository.error-translation.test.ts
  - src/infrastructure/db/repositories/__tests__/player.repository.test.ts
  - src/lib/features/game/helpers/optimistic/test/substitution.helper.test.ts
  - src/entities/__tests__/record.test.ts
  - src/lib/features/record/helpers/queries/tests/previous-scores.helper.test.ts
  - src/applications/usecases/game/__tests__/find-game.usecase.test.ts
  - src/infrastructure/db/repositories/__tests__/record.repository.test.ts
  - src/applications/usecases/player/__tests__/accept-invitation.usecase.test.ts
  - src/applications/usecases/record/__tests__/record-errors.test.ts
  - src/applications/usecases/game/__tests__/create-rally.usecase.test.ts
  - src/infrastructure/services/auth/__tests__/authentication.service.test.ts
  - src/lib/features/record/helpers/queries/tests/previous-rally.helper.test.ts
  - src/app/api/games/__tests__/route.test.ts
  - src/applications/usecases/player/__tests__/get-user-players.usecase.test.ts
  - src/components/record/__tests__/set-options-panel.test.tsx
  - src/lib/features/game/helpers/optimistic/test/rally.helper.test.ts
  - src/lib/features/record/helpers/queries/tests/serving-status.helper.test.ts
  - src/applications/usecases/player/__tests__/update-player-info.usecase.test.ts
  - src/applications/usecases/user/__tests__/link-pending-invitations.usecase.test.ts
  - src/applications/usecases/team/__tests__/create-team.usecase.test.ts
  - src/lib/features/game/helpers/queries/tests/previous-rally.helper.test.ts
  - src/components/user/__tests__/invitations.test.tsx
  - src/applications/usecases/player/__tests__/cancel-invitation.usecase.test.ts
  - src/app/api/players/[playerId]/invitations/__tests__/route.test.ts
  - src/app/api/players/[playerId]/memberships/__tests__/route.test.ts
  - src/infrastructure/db/repositories/__tests__/team.repository.test.ts
  - src/lib/__tests__/auth-hook.test.ts
  - src/lib/features/record/helpers/queries/tests/match-phase.helper.test.ts
  - src/applications/usecases/player/__tests__/create-player.usecase.test.ts
  - src/lib/features/record/helpers/optimistic/test/substitution.helper.test.ts
  - src/applications/usecases/game/__tests__/create-set.usecase.test.ts
  - src/applications/usecases/player/__tests__/transfer-ownership.usecase.test.ts
  - src/app/api/users/[userId]/players/__tests__/route.test.ts
  - src/infrastructure/db/repositories/__tests__/user.repository.test.ts
  - src/lib/features/game/helpers/queries/tests/serving-status.helper.test.ts
  - src/__tests__/helpers/mock-mongoose.ts
  - src/applications/usecases/player/__tests__/reject-invitation.usecase.test.ts
  - src/components/landing/__tests__/highlights.test.tsx
  - src/lib/features/game/helpers/queries/tests/previous-scores.helper.test.ts
  - src/applications/usecases/user/__tests__/search-user.usecase.test.ts
  - src/infrastructure/services/auth/__tests__/authorization.service.test.ts
  - src/__tests__/helpers/fixtures.ts
  - src/components/team/__tests__/membership-section-loading.test.tsx
  - src/applications/usecases/game/__tests__/update-rally.usecase.test.ts
  - src/applications/usecases/player/__tests__/create-invitation.usecase.test.ts
  - src/applications/usecases/player/__tests__/get-team-players.usecase.test.ts
  - src/applications/usecases/player/__tests__/leave-team.usecase.test.ts
  - src/app/api/players/[playerId]/__tests__/route.test.ts
  - src/entities/__tests__/player.test.ts
  - src/lib/validations/__tests__/player.test.ts
  - src/components/team/__tests__/team-info-error-state.test.tsx
  - src/app/api/teams/[teamId]/players/__tests__/create-player.test.ts
  - src/applications/usecases/game/__tests__/update-set.usecase.test.ts
  - src/applications/usecases/player/__tests__/remove-player.usecase.test.ts
  - src/applications/usecases/player/__tests__/get-player.usecase.test.ts
  - src/infrastructure/db/repositories/__tests__/game.repository.test.ts
  - src/applications/usecases/user/__tests__/create-profile.usecase.test.ts
  - src/applications/usecases/player/__tests__/update-role.usecase.test.ts
  - src/__tests__/helpers/index.ts
  - src/applications/usecases/game/__tests__/create-substitution.usecase.test.ts
  - src/entities/__tests__/game.test.ts
-->

---

### Requirement: withErrorHandler route wrapper and HTTP error response format

The system SHALL provide a `withErrorHandler` higher-order function in `src/lib/api/wrappers.ts` (Route Handler layer) that wraps Next.js route handler functions (`GET`, `POST`, `PATCH`, `DELETE` exports).

The wrapper SHALL execute a try/catch around the handler and map caught errors to structured HTTP responses with a fixed field structure and no envelope:

- `AppError` instances → `{ code, reason, detail, details? }` with `error.httpStatus` as the response status code. `details` SHALL only be present for `VALIDATION` errors.
- `ZodError` instances → converted to `ValidationError` with Zod issues array as `details`, responded with status 400
- Any other error → wrapped as `UnexpectedError`, responded with status 500 and the fixed body `{ code: "UNEXPECTED", reason: "UNHANDLED_ERROR", detail: "An unexpected error occurred" }`

The wrapper SHALL NOT expose `error.message` (internal, can contain IDs) in HTTP responses. Only `error.detail` (de-identified) SHALL be serialized. The response body SHALL NOT contain an `error` string field (legacy format).

Success responses SHALL continue to return the entity directly (no envelope, no change from current behavior).

#### Scenario: AppError is serialized to structured response

- **WHEN** a use case throws `new ConflictError("ALREADY_INVITED", "This player already has a pending invitation", "Player 6721a already invited to team abc")`
- **THEN** the HTTP response status SHALL be `409`
- **THEN** the response body SHALL be `{ "code": "CONFLICT", "reason": "ALREADY_INVITED", "detail": "This player already has a pending invitation" }`
- **THEN** the response body SHALL NOT contain the string `"6721a"` or `"abc"`

#### Scenario: ZodError is converted to ValidationError

- **WHEN** request body parsing throws a `ZodError` with issues `[{ path: ["email"], message: "Invalid email" }]`
- **THEN** the HTTP response status SHALL be `400`
- **THEN** the response body SHALL be `{ "code": "VALIDATION", "reason": "INVALID_INPUT", "detail": "Request data failed validation", "details": [{ "path": ["email"], "message": "Invalid email" }] }`

#### Scenario: Unknown error is wrapped as UnexpectedError

- **WHEN** an unexpected `TypeError` is thrown within the handler
- **THEN** the HTTP response status SHALL be `500`
- **THEN** the response body SHALL be `{ "code": "UNEXPECTED", "reason": "UNHANDLED_ERROR", "detail": "An unexpected error occurred" }`
- **THEN** the response body SHALL NOT contain the original error message or stack trace

---

### Requirement: withAuth route wrapper

The system SHALL provide a `withAuth` higher-order function in `src/lib/api/wrappers.ts` that extends `withErrorHandler` with session validation. It SHALL:

1. Call `auth.api.getSession({ headers: await headers() })` to validate the session
2. If no valid session: throw `AuthenticationError(AuthReason.SESSION_REQUIRED, "Authentication is required to access this resource")`
3. If session valid: pass `{ userId: session.user.id }` to the handler via a context parameter

The thrown `AuthenticationError` SHALL be caught by the outer `withErrorHandler` and serialized as a standard error response.

#### Scenario: Authenticated request passes userId to handler

- **WHEN** a request with a valid session (user ID `"user123"`) hits a `withAuth`-wrapped route
- **THEN** the handler SHALL receive `{ userId: "user123" }` as the second argument

#### Scenario: Unauthenticated request returns 401

- **WHEN** a request with no session or an invalid session hits a `withAuth`-wrapped route
- **THEN** the HTTP response status SHALL be `401`
- **THEN** the response body SHALL be `{ "code": "AUTHENTICATION", "reason": "SESSION_REQUIRED", "detail": "Authentication is required to access this resource" }`

---

### Requirement: Structured error logging

The `withErrorHandler` wrapper SHALL emit a structured JSON log event via `console.error()` for every caught error.

For operational errors (`AppError`): log level `"warn"` with fields `code`, `reason`, `message` (internal), `path`, `method`, `timestamp`.

For unexpected errors (non-`AppError`): log level `"error"` with fields `code: "UNEXPECTED"`, `reason: "UNHANDLED_ERROR"`, `message`, `stack`, `path`, `method`, `timestamp`.

Logs SHALL use `console.error()` (not `console.log()`) to ensure they are not stripped by the `removeConsole` production configuration.

#### Scenario: Operational error produces warn-level log

- **WHEN** a `NotFoundError` is caught by `withErrorHandler`
- **THEN** a JSON log with `"level": "warn"` SHALL be emitted via `console.error()`
- **THEN** the log SHALL contain `code`, `reason`, `message`, `path`, `method`, and `timestamp` fields

#### Scenario: Unexpected error produces error-level log

- **WHEN** an unknown `TypeError` is caught by `withErrorHandler`
- **THEN** a JSON log with `"level": "error"` SHALL be emitted via `console.error()`
- **THEN** the log SHALL contain the original error `stack` trace

---

### Requirement: Proxy API authentication gate

`src/proxy.ts` SHALL be extended to return a `401` JSON response for unauthenticated API requests. The proxy SHALL:

1. Check if the request path starts with `/api` and is not an auth route (`/api/auth/*`)
2. If the session cookie is absent: return `{ code: "AUTHENTICATION", reason: "SESSION_REQUIRED", detail: "Authentication is required" }` with status `401`
3. If the session cookie is present: pass the request through to the Node.js runtime

This check SHALL run in Edge Runtime and SHALL NOT perform database queries. It is an optimistic check only — the `withAuth` wrapper performs definitive session validation.

#### Scenario: Unauthenticated API request blocked by proxy

- **WHEN** a request to `/api/teams` arrives without a session cookie
- **THEN** the proxy SHALL return HTTP 401 with the structured error response
- **THEN** the request SHALL NOT reach the Node.js route handler

#### Scenario: Auth API routes are excluded from proxy check

- **WHEN** a request to `/api/auth/sign-in` arrives without a session cookie
- **THEN** the proxy SHALL pass the request through without blocking

#### Scenario: Authenticated API request passes through proxy

- **WHEN** a request to `/api/teams` arrives with a valid session cookie
- **THEN** the proxy SHALL pass the request through to the route handler

---

### Requirement: API client and frontend error consumption

The system SHALL provide a unified API client in `src/lib/api/api-client.ts` that wraps `fetch` for all HTTP methods. On non-OK responses, it SHALL parse the response body and throw a structured error object with `code`, `reason`, `detail`, `details` (optional), and `status` fields.

The SWR fetcher in `src/hooks/use-data.ts` SHALL use `apiClient` as its fetcher. Manual fetch calls (POST, PATCH, DELETE) in components SHALL also use `apiClient` instead of raw `fetch`.

Components SHALL determine user-facing toast messages by switching on `error.code` and `error.reason`, using component-local zh-TW strings. The `error.detail` (en-US) SHALL serve as a fallback when no matching zh-TW string exists for a given reason.

#### Scenario: apiClient throws structured error on failure

- **WHEN** `apiClient("/api/teams/abc/players", { method: "POST", body })` receives a 409 response with `{ code: "CONFLICT", reason: "ALREADY_INVITED", detail: "This player already has a pending invitation" }`
- **THEN** the thrown error SHALL have `status: 409`, `code: "CONFLICT"`, `reason: "ALREADY_INVITED"`, `detail: "This player already has a pending invitation"`

#### Scenario: SWR hook uses apiClient

- **WHEN** a SWR hook fetches `/api/profiles` and receives a 404 response
- **THEN** the SWR `error` SHALL have `status: 404`, `code: "NOT_FOUND"`, and `reason` fields

#### Scenario: Component displays zh-TW toast with reason-based message

- **WHEN** a component catches an error with `reason: "ALREADY_INVITED"`
- **THEN** it SHALL display the component-local zh-TW string mapped to that reason (e.g., "此球員已有待處理的邀請")

#### Scenario: Component falls back to error.detail

- **WHEN** a component catches an error with a `reason` that has no mapped zh-TW string
- **THEN** it SHALL display `error.detail` as the toast message
