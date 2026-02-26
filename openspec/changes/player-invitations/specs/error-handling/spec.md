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

### Requirement: Mixed error handling pattern

Use cases in pilot scope SHALL use Result type for business logic outcomes. Infrastructure errors (database crashes, network failures) MAY still throw. Callers SHALL handle both patterns (Application layer convention).

#### Scenario: Use case returns Result for business error

- **WHEN** `LinkPendingInvitationsUseCase` encounters a database write failure
- **THEN** it SHALL catch the error and return `{ ok: false, error: TransientError }`

#### Scenario: Use case returns Result for success

- **WHEN** `CreateProfileUseCase` successfully creates a profile
- **THEN** it SHALL return `{ ok: true, value: <profile> }`

### Requirement: Pilot scope limitation

The Result pattern and AppError hierarchy SHALL be applied only to `LinkPendingInvitationsUseCase` and `CreateProfileUseCase` in this change. All other existing use cases SHALL continue using the current `throw new Error()` pattern until a dedicated migration change is created.

#### Scenario: Non-pilot use case unchanged

- **WHEN** `AcceptInvitationUseCase` encounters an error
- **THEN** it SHALL continue to `throw new Error(message)` (no change from current behavior)
