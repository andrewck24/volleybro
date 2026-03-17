## ADDED Requirements

### Requirement: Link pending invitations on user registration

When a new user registers, the system SHALL automatically link all Player records that have `status: INVITED` and `email` matching the new user's email. The linking SHALL set `userId` to the new user's ID, clear the `email` field, and keep `status: INVITED` (Infrastructure layer: registration hook + Application layer: LinkPendingInvitationsUseCase).

#### Scenario: User registers with matching pending invitations

- **WHEN** a new user registers with email `alice@example.com`
- **AND** there are 3 Player records with `status: INVITED, email: alice@example.com` across different teams
- **THEN** all 3 Player records SHALL be updated to `userId: <new_user_id>, email: undefined, status: INVITED`
- **THEN** the user SHALL be able to see these invitations in the app

#### Scenario: User registers with no pending invitations

- **WHEN** a new user registers with email `bob@example.com`
- **AND** there are no Player records with `email: bob@example.com`
- **THEN** no Player records SHALL be modified
- **THEN** registration SHALL complete normally

### Requirement: Registration hook uses use case directly

The `user.create.after` hook in Better Auth SHALL resolve use cases directly from the DI container, not through controllers (Infrastructure layer). The existing `createProfileController` call SHALL also be refactored to use `CreateProfileUseCase` directly.

#### Scenario: Hook execution order

- **WHEN** a new user is created
- **THEN** the hook SHALL first execute `CreateProfileUseCase.execute({ userId })`
- **THEN** the hook SHALL execute `LinkPendingInvitationsUseCase.execute({ userId, email })`

### Requirement: Batch update via updateMany

The `LinkPendingInvitationsUseCase` SHALL use a repository method that performs a MongoDB `updateMany` operation in a single database call (Infrastructure layer: PlayerRepository).

#### Scenario: Batch update updates all matching records

- **WHEN** `LinkPendingInvitationsUseCase` executes with `{ userId: "u1", email: "alice@example.com" }`
- **THEN** the repository SHALL execute `updateMany({ email: "alice@example.com", status: "INVITED" }, { $set: { userId: "u1" }, $unset: { email: "" } })`
- **THEN** only Player records matching both `email` and `status: INVITED` SHALL be affected

#### Scenario: Idempotent re-execution

- **WHEN** `LinkPendingInvitationsUseCase` is executed twice with the same input
- **THEN** the second execution SHALL match 0 documents (already updated records no longer match the query)
- **THEN** no errors SHALL occur

### Requirement: Retry on transient failure

If the `LinkPendingInvitationsUseCase` fails with a TransientError, the registration hook SHALL retry once after a short delay. If the retry also fails, the hook SHALL log the error and allow registration to complete (Infrastructure layer).

#### Scenario: First attempt fails, retry succeeds

- **WHEN** the first `LinkPendingInvitationsUseCase` execution fails with a TransientError
- **THEN** the hook SHALL wait briefly and retry once
- **THEN** the retry SHALL succeed and all matching Player records SHALL be linked

#### Scenario: Both attempts fail

- **WHEN** both the first and retry attempts fail
- **THEN** the hook SHALL log the error with `console.error`
- **THEN** the user registration SHALL complete successfully (not blocked)
- **THEN** the Profile creation (step 1) SHALL NOT be rolled back

### Requirement: LinkPendingInvitationsUseCase returns Result type

The `LinkPendingInvitationsUseCase` SHALL return a `Result<number>` where the value is the count of linked Player records. On failure, it SHALL return `{ ok: false, error: <AppError> }` instead of throwing (Application layer).

#### Scenario: Successful linking returns count

- **WHEN** 3 Player records are linked
- **THEN** the use case SHALL return `{ ok: true, value: 3 }`

#### Scenario: Database failure returns TransientError

- **WHEN** the MongoDB updateMany operation fails
- **THEN** the use case SHALL return `{ ok: false, error: TransientError }`
