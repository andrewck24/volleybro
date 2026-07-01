## Requirements

### Requirement: Explicit Player status field

The Player entity SHALL have an explicit `status` field with enum values `NONE`, `INVITED`, `JOINED`. The status field SHALL be required and stored in the database (Domain + Infrastructure layers). The previous `getPlayerStatus()` function and Mongoose virtual `status` SHALL be removed.

#### Scenario: New player created without invitation

- **WHEN** a team admin creates a new player without providing email or userId
- **THEN** the player record SHALL have `status: NONE`, `userId: undefined`, `email: undefined`

#### Scenario: New player created with email (immediate invitation to unregistered user)

- **WHEN** a team admin creates a new player and provides an email
- **THEN** the player record SHALL have `status: INVITED`, `email: <provided>`, `userId: undefined`

---

### Requirement: Player status field constraints

The system SHALL enforce the following field constraints based on status (Domain layer validation):

| status  | userId    | email     |
| ------- | --------- | --------- |
| NONE    | undefined | undefined |
| INVITED | defined   | undefined |
| INVITED | undefined | defined   |
| JOINED  | defined   | undefined |

Any other combination SHALL be rejected as invalid.

#### Scenario: Reject NONE status with userId

- **WHEN** an operation attempts to set a player to `status: NONE` with a non-empty `userId`
- **THEN** the system SHALL reject the operation with a ValidationError

#### Scenario: Reject INVITED status without userId and email

- **WHEN** an operation attempts to set a player to `status: INVITED` with both `userId` and `email` undefined
- **THEN** the system SHALL reject the operation with a ValidationError

#### Scenario: INVITED status with both userId and email pointing to same user

- **WHEN** an operation results in a player with `status: INVITED`, both `userId` and `email` defined, and the `email` matches the user identified by `userId`
- **THEN** the system SHALL keep `userId`, clear `email` to undefined, and retain `status: INVITED`

#### Scenario: INVITED status with both userId and email pointing to different users

- **WHEN** an operation results in a player with `status: INVITED`, both `userId` and `email` defined, and the `email` does NOT match the user identified by `userId`
- **THEN** the system SHALL reject the operation with a ValidationError

#### Scenario: Reject JOINED status without userId

- **WHEN** an operation attempts to set a player to `status: JOINED` without a `userId`
- **THEN** the system SHALL reject the operation with a ValidationError

---

### Requirement: Invite registered user

When a team admin invites a registered user (found via user search), the system SHALL set `Player.userId` to the found user's ID and `Player.status` to `INVITED` (Application layer: CreateInvitationUseCase). The admin MUST have ADMIN or OWNER role.

#### Scenario: Invite a registered user to NONE player

- **WHEN** a team admin invites a registered user to a player with `status: NONE`
- **THEN** the player SHALL be updated to `status: INVITED`, `userId: <user_id>`, `email: undefined`
- **THEN** the API SHALL respond with HTTP 200 and the updated player

#### Scenario: Invite to a player already INVITED

- **WHEN** a team admin attempts to invite a user to a player with `status: INVITED`
- **THEN** the system SHALL reject with a ValidationError (HTTP 400)

#### Scenario: Invite to a player already JOINED

- **WHEN** a team admin attempts to invite a user to a player with `status: JOINED`
- **THEN** the system SHALL reject with a ValidationError (HTTP 400)

---

### Requirement: Invitation UI search flow

The InviteSection component (Presentation layer) SHALL provide a search-first invitation flow. The admin enters an email, the frontend validates format locally, then queries the user search API to determine the invitation path.

#### Scenario: Admin enters non-email format input

- **WHEN** the admin enters a value that is not a valid email format in the search field
- **THEN** the frontend SHALL show a validation error without sending a request to the API

#### Scenario: Search finds registered user

- **WHEN** the admin enters a valid email and clicks search
- **AND** `GET /api/users?email={email}` returns HTTP 200 with `{ _id, name, image }`
- **THEN** the InviteSection SHALL display the user's avatar and name
- **THEN** the admin SHALL be able to select a role and submit the invitation (filling `userId`)

#### Scenario: Search finds no registered user

- **WHEN** the admin enters a valid email and clicks search
- **AND** `GET /api/users?email={email}` returns HTTP 404
- **THEN** the InviteSection SHALL display a message: the email is not yet registered, and the invitation will take effect after the user registers
- **THEN** the admin SHALL be able to select a role and submit the invitation (filling `email`)

#### Scenario: Search request fails

- **WHEN** the admin enters a valid email and clicks search
- **AND** the API returns an error (non-404)
- **THEN** the InviteSection SHALL display an error message and allow retry

---

### Requirement: Invite unregistered user

When a team admin invites by email and no registered user is found, the system SHALL set `Player.email` to the provided email and `Player.status` to `INVITED` (Application layer: CreateInvitationUseCase).

#### Scenario: Invite an unregistered user to NONE player

- **WHEN** a team admin provides an email that does not match any registered user
- **THEN** the player SHALL be updated to `status: INVITED`, `email: <email>`, `userId: undefined`

---

### Requirement: Accept invitation

A user with a pending invitation (`status: INVITED`, `userId` matches requesting user) SHALL be able to accept, transitioning the player to `status: JOINED` (Application layer: AcceptInvitationUseCase).

#### Scenario: Accept invitation successfully

- **WHEN** a user accepts an invitation for a player with `status: INVITED` and matching `userId`
- **THEN** the player SHALL be updated to `status: JOINED`
- **THEN** the user's `Profile.activeTeamId` SHALL be set to the player's `teamId`
- **THEN** the API SHALL respond with HTTP 200

#### Scenario: Accept invitation for non-INVITED player

- **WHEN** a user attempts to accept an invitation for a player with `status: NONE` or `status: JOINED`
- **THEN** the system SHALL reject with a ValidationError (HTTP 400)

---

### Requirement: Reject invitation

A user with a pending invitation (`status: INVITED`, `userId` matches requesting user) SHALL be able to reject, transitioning the player to `status: NONE` (Application layer: RejectInvitationUseCase).

#### Scenario: Reject invitation successfully

- **WHEN** a user rejects an invitation for a player with `status: INVITED` and matching `userId`
- **THEN** the player SHALL be updated to `status: NONE`, `userId: undefined`, `email: undefined`
- **THEN** the API SHALL respond with HTTP 200

---

### Requirement: Cancel invitation

A team admin SHALL be able to cancel a pending invitation (`status: INVITED`), transitioning the player to `status: NONE` (Application layer: CancelInvitationUseCase).

#### Scenario: Cancel invitation for registered user

- **WHEN** a team admin cancels an invitation for a player with `status: INVITED` and `userId` defined
- **THEN** the player SHALL be updated to `status: NONE`, `userId: undefined`

#### Scenario: Cancel invitation for unregistered user

- **WHEN** a team admin cancels an invitation for a player with `status: INVITED` and `email` defined
- **THEN** the player SHALL be updated to `status: NONE`, `email: undefined`

---

### Requirement: Leave team

A joined user (`status: JOINED`) SHALL be able to leave the team, transitioning the player to `status: NONE` (Application layer: LeaveTeamUseCase). The player record SHALL be preserved.

#### Scenario: Leave team successfully

- **WHEN** a user leaves a team for a player with `status: JOINED` and matching `userId`
- **THEN** the player SHALL be updated to `status: NONE`, `userId: undefined`
- **THEN** the player SHALL be removed from all team lineups
- **THEN** the API SHALL respond with HTTP 200

#### Scenario: Leave team confirmation UI

- **WHEN** the leave team action is presented in the UI
- **THEN** it SHALL be placed at the bottom of the team info page with a confirmation prompt warning that the user will lose access to team information and personal statistics

#### Scenario: Owner cannot leave team

- **WHEN** a team owner attempts to leave
- **THEN** the system SHALL reject with a ValidationError (must transfer ownership first)

---

### Requirement: Team creation sets owner player status

When a new team is created via `POST /api/teams`, the owner player record SHALL be created with `status: JOINED` and `role: OWNER` (API route layer).

#### Scenario: Create team with owner player

- **WHEN** a user creates a new team
- **THEN** an owner player SHALL be created with `status: JOINED`, `role: OWNER`, `userId: <creator_id>`
- **THEN** the creator's `Profile.activeTeamId` SHALL be set to the new team's ID

---

### Requirement: Profile.teams removal and activeTeamId

The `Profile.teams.joined[]` and `Profile.teams.inviting[]` fields SHALL be removed. A new `Profile.activeTeamId` field (optional string) SHALL replace the team ordering functionality (Domain + Infrastructure layers).

#### Scenario: Determine active team

- **WHEN** the frontend reads `Profile.activeTeamId`
- **THEN** it SHALL use that team as the current active team for navigation and display

#### Scenario: activeTeamId is null

- **WHEN** `Profile.activeTeamId` is null (new user, no teams)
- **THEN** the frontend SHALL show new user guidance

#### Scenario: activeTeamId points to invalid team

- **WHEN** `Profile.activeTeamId` points to a team the user is no longer a member of
- **THEN** the frontend SHALL fallback to the first JOINED player's teamId, or show new user guidance if none exist

#### Scenario: Switch active team

- **WHEN** a user switches teams via `PATCH /api/profiles` with `{ activeTeamId: <teamId> }`
- **THEN** `Profile.activeTeamId` SHALL be updated
- **THEN** the API SHALL respond with HTTP 200

---

### Requirement: Query user teams via Player

The system SHALL derive a user's joined and invited teams from `Player.find({ userId })` rather than from `Profile.teams` (Application layer: GetUserPlayersUseCase).

#### Scenario: Get user's teams

- **WHEN** the frontend requests `GET /api/users/{userId}/players`
- **THEN** the response SHALL include all Player records for that userId
- **THEN** the frontend SHALL filter by `status === JOINED` for joined teams and `status === INVITED` for pending invitations

---

### Requirement: Legacy system removal

The following legacy components SHALL be removed:

- `GET/PATCH /api/users/teams` route
- `useUserTeams` SWR hook
- `ConfirmInvitation` component

#### Scenario: Legacy route returns 404

- **WHEN** a client requests `GET /api/users/teams` or `PATCH /api/users/teams`
- **THEN** the system SHALL return HTTP 404 (route no longer exists)
