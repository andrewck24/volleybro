## Requirements

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
