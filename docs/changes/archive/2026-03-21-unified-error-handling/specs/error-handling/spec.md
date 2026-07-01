## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: AppErrorCode type union

The system SHALL define an `AppErrorCode` type as a union of string literals: `"VALIDATION" | "AUTHENTICATION" | "AUTHORIZATION" | "NOT_FOUND" | "CONFLICT" | "TRANSIENT" | "UNEXPECTED"`.

#### Scenario: AppErrorCode matches subclass codes

- **WHEN** each error subclass is instantiated
- **THEN** its `code` property SHALL be assignable to `AppErrorCode`

### Requirement: ValidationError with details field

`ValidationError` SHALL accept an optional `details` parameter (fourth argument) for carrying structured validation information such as Zod issue arrays. Other error subclasses SHALL NOT have a `details` field.

#### Scenario: ValidationError with Zod issues

- **WHEN** `new ValidationError("INVALID_INPUT", "Request data failed validation", undefined, zodError.issues)` is created
- **THEN** `error.details` SHALL contain the Zod issues array
- **THEN** `error.httpStatus` SHALL be `400`

#### Scenario: ValidationError without details

- **WHEN** `new ValidationError("INVALID_EMAIL", "Invalid email format")` is created
- **THEN** `error.details` SHALL be `undefined`

### Requirement: UnexpectedError with originalError field

`UnexpectedError` SHALL accept an optional `originalError` parameter for preserving the original caught error. This field SHALL be used for logging only and SHALL NOT be serialized to HTTP responses.

#### Scenario: UnexpectedError wrapping unknown error

- **WHEN** an unknown error is caught and wrapped as `new UnexpectedError("UNHANDLED_ERROR", "An unexpected error occurred", undefined, originalError)`
- **THEN** `error.originalError` SHALL reference the original error object
- **THEN** `error.httpStatus` SHALL be `500`

### Requirement: TransientError with source metadata

`TransientError` SHALL accept an optional `options` object with `source` (string identifying the failing infrastructure component) and `retryable` (boolean hint for callers). These fields SHALL be used for server-side logging and retry decisions only and SHALL NOT be serialized to HTTP responses.

#### Scenario: TransientError with database source

- **WHEN** `new TransientError("DATABASE_UNAVAILABLE", "Service temporarily unavailable", undefined, { source: "database", retryable: true })` is created
- **THEN** `error.source` SHALL be `"database"`
- **THEN** `error.retryable` SHALL be `true`
- **THEN** `error.httpStatus` SHALL be `503`

### Requirement: Domain-scoped reason enums

The system SHALL define reason enums grouped by domain entity in `src/entities/errors/reasons/`. Each domain entity that throws errors SHALL have a corresponding reason enum file. A shared `CommonReason` enum SHALL exist for cross-domain values.

Each enum value SHALL be an `UPPER_SNAKE_CASE` string. The `reason` field on `AppError` SHALL accept any of these enum values. Concrete enum values SHALL be determined during per-domain migration based on analysis of all error paths in that domain.

#### Scenario: Reason enum follows naming convention

- **WHEN** a new reason enum is created for a domain entity
- **THEN** the file SHALL be located at `src/entities/errors/reasons/<entity>.ts`
- **THEN** the enum SHALL be named `<Entity>Reason` (e.g., `PlayerReason`, `RecordReason`)
- **THEN** all enum values SHALL use `UPPER_SNAKE_CASE` format

#### Scenario: CommonReason provides shared values

- **WHEN** an error reason is not specific to any single domain entity
- **THEN** it SHALL be defined in `CommonReason` at `src/entities/errors/reasons/common.ts`

### Requirement: Only AppError subclasses shall be thrown

All application code (use cases, services, repositories) SHALL throw only `AppError` subclasses. Throwing `new Error("message")` directly SHALL be prohibited. Infrastructure layers SHALL catch external library errors (Mongoose, Better Auth) and translate them into the appropriate `AppError` subclass before re-throwing.

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

## REMOVED Requirements

### Requirement: Result type definition

**Reason**: Replaced by throw-only pattern. All use cases throw `AppError` subclasses instead of returning `Result<T>`. The `Result<T>` type definition is kept in `src/applications/types/result.ts` for edge cases (auth hook retry logic) but is no longer a standard pattern.

**Migration**: Replace `Result<T>` return types with direct returns. Replace `{ ok: false, error }` with `throw error`. Replace `if (!result.ok)` checks with try/catch.

### Requirement: Mixed error handling pattern

**Reason**: Superseded by the throw-only rule. All use cases throw `AppError` subclasses uniformly.

**Migration**: Use cases that returned `Result<T>` (CreateProfileUseCase, LinkPendingInvitationsUseCase) SHALL be refactored to throw `AppError` subclasses. Callers (auth hook) SHALL use try/catch instead of `result.ok` checks.

### Requirement: Pilot scope limitation

**Reason**: The unified error pattern now applies to all use cases, not just pilot scope.

**Migration**: All use cases SHALL be migrated to throw `AppError` subclasses domain by domain.
