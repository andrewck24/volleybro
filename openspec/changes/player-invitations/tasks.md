## 1. Error Handling Foundation (Application Layer)

- [ ] 1.1 Write unit tests for AppError hierarchy (instanceof checks, code/isTransient properties) and Result type
- [ ] 1.2 Create `AppError` abstract base class and concrete subclasses (`NotFoundError`, `ValidationError`, `AuthorizationError`, `ConflictError`, `TransientError`) in `src/applications/errors/`
- [ ] 1.3 Define `Result<T>` discriminated union type in `src/applications/types/result.ts`

## 2. Domain Layer — Entity Updates

- [ ] 2.1 Write unit tests for Player entity — status constraints (NONE requires no userId/email, INVITED requires exactly one, JOINED requires userId, invalid combos rejected)
- [ ] 2.2 Write unit tests for Profile entity — `activeTeamId` field, `teams` removed
- [ ] 2.3 Update `PlayerStatus` enum in `src/entities/player.ts` to `NONE` / `INVITED` / `JOINED`, add explicit `status` field, remove `getPlayerStatus()` helper
- [ ] 2.4 Add domain-level validation for status-field constraints
- [ ] 2.5 Update `src/entities/profile.ts` — remove `teams` (joined/inviting arrays), add optional `activeTeamId` field

## 3. Infrastructure Layer — Schema & Repository Updates

- [ ] 3.1 Write unit tests for Player Mongoose schema (status field required, enum validation) and `linkUserToInvitations` repository method
- [ ] 3.2 Write unit tests for Profile Mongoose schema (activeTeamId field, teams removed)
- [ ] 3.3 Update Player Mongoose schema — add `status` field (enum, required, default NONE), remove virtual `status` computation
- [ ] 3.4 Add `linkUserToInvitations(email: string, userId: string)` to Player repository interface and Mongoose implementation (using `updateMany`)
- [ ] 3.5 Update Profile Mongoose schema — remove `teams` embedded fields, add `activeTeamId` (optional String)
- [ ] 3.6 Remove Profile repository methods: `addTeamToJoined`, `addTeamToInviting`, `removeTeamFromJoined`, `removeTeamFromInviting`

## 4. Application Layer — Use Case Updates (Player)

- [ ] 4.1 Write unit tests for `LinkPendingInvitationsUseCase` — success returns `Result<number>`, DB failure returns TransientError, idempotent re-execution
- [ ] 4.2 Write unit tests for `SearchUserUseCase` — found returns minimal info, not found returns 404, invalid email returns 400
- [ ] 4.3 Write unit tests for `GetUserPlayersUseCase` — returns all players for userId
- [ ] 4.4 Write unit tests for updated invitation use cases (CreateInvitation, AcceptInvitation, RejectInvitation, CancelInvitation) with new status transitions
- [ ] 4.5 Write unit tests for `LeaveTeamUseCase` — status→NONE, clear userId, remove from lineups, owner cannot leave
- [ ] 4.6 Write unit tests for refactored `CreateProfileUseCase` returning `Result<Profile>`
- [ ] 4.7 Implement `LinkPendingInvitationsUseCase` — uses `linkUserToInvitations` repo method, returns `Result<number>`
- [ ] 4.8 Implement `SearchUserUseCase` — exact email match, return `{ _id, name, image }`
- [ ] 4.9 Implement `GetUserPlayersUseCase` — query `Player.find({ userId })`
- [ ] 4.10 Update all existing Player use cases to use explicit `status` field instead of field-based derivation
- [ ] 4.11 Update invitation-related use cases (CreateInvitation, AcceptInvitation, RejectInvitation, CancelInvitation) to use status transitions per spec
- [ ] 4.12 Implement `LeaveTeamUseCase` — set status→NONE, clear userId, remove from lineups, validate owner cannot leave
- [ ] 4.13 Refactor `CreateProfileUseCase` to return `Result<Profile>` instead of throwing
- [ ] 4.14 Update Profile use cases to remove all `teams.joined/inviting` manipulation, support `activeTeamId` updates

## 5. Infrastructure Layer — Auth Hook Refactor

- [ ] 5.1 Write unit tests for hook flow — CreateProfileUseCase then LinkPendingInvitationsUseCase, retry-once on transient failure, both fail → log + continue
- [ ] 5.2 Refactor `user.create.after` hook in `src/lib/auth.ts` — resolve `CreateProfileUseCase` directly from DI container (bypass controller)
- [ ] 5.3 Add `LinkPendingInvitationsUseCase` call after profile creation in the hook, with retry-once-on-transient-failure logic

## 6. API Routes — New & Modified Endpoints

- [ ] 6.1 Expand `GET /api/users` route — add `?email=` search param dispatch to `SearchUserUseCase`, Zod validation, rate limiting
- [ ] 6.2 Update `PATCH /api/profiles` validation schema to support `activeTeamId` field
- [ ] 6.3 Update `POST /api/teams` — create owner player with `status: JOINED`, set `Profile.activeTeamId` instead of `profile.teams.joined.unshift()`
- [ ] 6.4 Add `GET /api/users/{userId}/players` route for player-based team queries
- [ ] 6.5 Update Player-related route validation schemas to include `status` field
- [ ] 6.6 Update `AcceptInvitationUseCase` caller to also set `Profile.activeTeamId`

## 7. Legacy System Removal

- [ ] 7.1 Delete `GET/PATCH /api/users/teams` route files
- [ ] 7.2 Delete `useUserTeams` SWR hook from `src/hooks/use-data.ts`
- [ ] 7.3 Delete `ConfirmInvitation` component
- [ ] 7.4 Remove all imports and references to deleted modules across codebase

## 8. UI Components — Invitation Flow

- [ ] 8.1 Rewrite `InviteSection` — replace email input with user search UI (button-triggered fetch, not SWR), display found user info or unregistered message
- [ ] 8.2 Update `InvitedSection` — show user info (avatar, name) for userId-based invites, show email for email-based invites
- [ ] 8.3 Update `InvitationList` — change filter to `player.status === INVITED`
- [ ] 8.4 Rewrite `Invitations` page — data source from player-based SWR query, filter INVITED
- [ ] 8.5 Rewrite `Menu` component — team list from player-based SWR query, team switch via `PATCH /api/profiles` (activeTeamId)
- [ ] 8.6 Add Leave Team UI — button at bottom of team info page with confirmation dialog

## 9. UI Components — activeTeamId Migration

- [ ] 9.1 Update `NavLinks` — replace `profile?.teams?.joined?.[0]` with `profile.activeTeamId`
- [ ] 9.2 Update `Home` — replace `profile?.teams?.joined?.[0]` with `profile.activeTeamId`
- [ ] 9.3 Update `Notifications` — replace `profile?.teams?.joined[0]` with `profile.activeTeamId`
- [ ] 9.4 Implement frontend fallback logic — when `activeTeamId` is null or invalid, fallback to first JOINED player's teamId or show onboarding

## 10. SWR Hooks

- [ ] 10.1 Create or adjust player-based SWR hook for fetching user's players (joined + invited teams)
- [ ] 10.2 Ensure all components consuming team data use the new hook instead of removed `useUserTeams`

## 11. Verification

- [ ] 11.1 Run `npm test` — all tests pass
- [ ] 11.2 Run `npm run lint` — no linting errors
- [ ] 11.3 Run `npm run build` — build succeeds without errors
- [ ] 11.4 Manual smoke test: create team → invite registered user → accept → switch team → leave team
- [ ] 11.5 Manual smoke test: invite unregistered email → register new user → verify invitation auto-linked
