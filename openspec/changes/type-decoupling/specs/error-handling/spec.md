## MODIFIED Requirements

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

- **WHEN** a custom repository method (e.g., `PlayerRepositoryImpl.findTeamOwner()`, `GameRepositoryImpl.findMatchesWithPagination()`) encounters a Mongoose error
- **THEN** the method SHALL catch the error and call `translateRepositoryError()` before re-throwing
- **THEN** the raw Mongoose error SHALL NOT propagate to the use case layer

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