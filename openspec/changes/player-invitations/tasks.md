## 1. Error Handling Foundation (Application Layer)

- [x] 1.1 Write unit tests for AppError hierarchy (instanceof checks, code/isTransient properties) and Result type
- [x] 1.2 Create `AppError` abstract base class and concrete subclasses (`NotFoundError`, `ValidationError`, `AuthorizationError`, `ConflictError`, `TransientError`) in `src/applications/errors/`
- [x] 1.3 Define `Result<T>` discriminated union type in `src/applications/types/result.ts`

## 2. Domain Layer — Entity Updates

- [x] 2.1 Write unit tests for Player entity — status constraints (NONE requires no userId/email, INVITED requires exactly one, JOINED requires userId, invalid combos rejected)
- [x] 2.2 ~~Write unit tests for Profile entity~~ — skipped: Profile is a plain TypeScript type with no runtime logic; `activeTeamId` optionality and `teams` removal are enforced by the type system at compile time, not testable runtime behaviour
- [x] 2.3 Update `PlayerStatus` enum in `src/entities/player.ts` to `NONE` / `INVITED` / `JOINED`, add explicit `status` field, remove `getPlayerStatus()` helper
- [x] 2.4 Add domain-level validation for status-field constraints
- [x] 2.5 Update `src/entities/profile.ts` — remove `teams` (joined/inviting arrays), add optional `activeTeamId` field

## 3. Infrastructure Layer — Schema & Repository Updates

- [x] 3.1 Write unit tests for `linkUserToInvitations` repository method (schema enum validation skipped: Mongoose schema constraints are framework behaviour, not our business logic)
- [x] 3.2 ~~Write unit tests for Profile Mongoose schema~~ — skipped: schema structure changes are enforced by TypeScript interface at compile time, no runtime logic to test
- [x] 3.3 Update Player Mongoose schema — add `status` field (enum, required, default NONE), remove virtual `status` computation
- [x] 3.4 Add `linkUserToInvitations(email: string, userId: string)` to Player repository interface and Mongoose implementation (using `updateMany`)
- [x] 3.5 Update Profile Mongoose schema — remove `teams` embedded fields, add `activeTeamId` (optional String)
- [x] 3.6 Remove Profile repository methods: `addTeamToJoined`, `addTeamToInviting`, `removeTeamFromJoined`, `removeTeamFromInviting`; add `updateActiveTeamId`

## 3b. Build Fix — Breaking Changes from Group 3

> Group 3 removes `Profile.teams` from the schema. The following files directly access `profile.teams` and must be patched before the build can succeed. These are subsets of Group 6/8/9 tasks pulled forward due to the breaking schema change.

- [x] 3b.1 Refactor `POST /api/teams` to follow clean architecture: introduce `CreateTeamUseCase` + `ITeamController.createTeam()`, then update the route to use the controller. Owner player must have `status: JOINED`; profile must have `activeTeamId = newTeamId` set (no more `profile.teams.joined`). **Architectural note**: `POST /api/teams` is a legacy route that directly mutates Mongoose models — this task also migrates it to the controller/use-case pattern. (Task 6.3, pulled forward and expanded)
- [x] 3b.2 Update `InvitationList` component — change filter to `player.status === INVITED` (Task 8.3, already done)
- [x] 3b.3 Update `MembershipSection` component — remove `getPlayerStatus()` import, use `player.status` directly; replace `PlayerStatus.PURE_PLAYER` with `PlayerStatus.NONE` (Task 8.2/8.3 partial, already done)
- [x] 3b.4 Delete `GET/PATCH /api/users/teams` route — fully depends on removed `profile.teams`; cannot compile (Task 7.1, pulled forward)
- [x] 3b.5 Update `CreateProfileUseCase` — remove `teams: { joined: [], inviting: [] }` from create call (Task 4.14, pulled forward)
- [x] 3b.6 Update `UpdateProfileUseCase` — remove business rule 3 (`teams` array validation) (Task 4.14, pulled forward)
- [x] 3b.7 Update `Home`, `NavLinks`, `Notifications` components — replace `profile.teams.joined[0]` with `profile.activeTeamId` (Task 9.1-9.3, pulled forward)
- [x] 3b.8 Delete `ConfirmInvitation` component — depends on deleted `/api/users/teams` endpoint and removed `profile.teams.inviting` (Task 7.3, pulled forward)
- [x] 3b.9 Stub out `Invitations` and `Menu` components — remove `useUserTeams` import and `profile.teams` references to unblock build; full rewrite deferred to Tasks 8.4/8.5

## 4. Application Layer — Use Case Updates (Player)

- [x] 4.1 Write unit tests for `LinkPendingInvitationsUseCase` — success returns `Result<number>`, DB failure returns TransientError, idempotent re-execution
- [x] 4.2 Write unit tests for `SearchUserUseCase` — found returns minimal info, not found returns 404, invalid email returns 400
- [x] 4.3 Write unit tests for `GetUserPlayersUseCase` — returns all players for userId (updated to include status field)
- [x] 4.4 Write unit tests for updated invitation use cases (CreateInvitation, AcceptInvitation, RejectInvitation, CancelInvitation) with new status transitions
- [x] 4.5 Write unit tests for `LeaveTeamUseCase` — status→NONE, clear userId, remove from lineups, owner cannot leave
- [x] 4.6 Write unit tests for refactored `CreateProfileUseCase` returning `Result<Profile>`
- [x] 4.7 Implement `LinkPendingInvitationsUseCase` — uses `linkUserToInvitations` repo method, returns `Result<number>`
- [x] 4.8 Implement `SearchUserUseCase` — exact email match, return `{ _id, name, image }`
- [x] 4.9 Implement `GetUserPlayersUseCase` — query `Player.find({ userId })` (already existed, verified correct)
- [x] 4.10 Update all existing Player use cases to use explicit `status` field instead of field-based derivation
- [x] 4.11 Update invitation-related use cases (CreateInvitation, AcceptInvitation, RejectInvitation, CancelInvitation) to use status transitions per spec
- [x] 4.12 Implement `LeaveTeamUseCase` — set status→NONE, clear userId, remove from lineups, validate owner cannot leave
- [x] 4.13 Refactor `CreateProfileUseCase` to return `Result<Profile>` instead of throwing
- [x] 4.14 Update Profile use cases to remove all `teams.joined/inviting` manipulation, support `activeTeamId` updates (done in 3b.5/3b.6)

## 5. Infrastructure Layer — Auth Hook Refactor

- [x] 5.1 Write unit tests for hook flow — CreateProfileUseCase then LinkPendingInvitationsUseCase, retry-once on transient failure, both fail → log + continue
- [x] 5.2 Refactor `user.create.after` hook in `src/lib/auth.ts` — extract to `src/lib/auth-hook.ts`, resolves use cases directly from DI container (bypass controller)
- [x] 5.3 Add `LinkPendingInvitationsUseCase` call after profile creation in the hook, with retry-once-on-transient-failure logic

## 6. API Routes — New & Modified Endpoints

- [x] 6.1 Expand `GET /api/users` route — add `?email=` search param dispatch to `SearchUserUseCase`, Zod validation (**known gap**: rate limiting not yet implemented, tracked for future change)
- [x] 6.1b Refactor `GET /api/users` to clean architecture — `getUserController` dispatches to `SearchUserUseCase` (by email) or `GetUserByIdUseCase` (by actorId), route only handles session/params parsing
- [x] 6.2 Update `PATCH /api/profiles` validation schema to support `activeTeamId` field (done via profile.controller.ts in Group 4)
- [x] 6.3 Refactor `POST /api/teams` — introduce `CreateTeamUseCase` + `ITeamController.createTeam()`, owner player with `status: JOINED`, set `Profile.activeTeamId` (done in 3b.1)
- [x] 6.4 Add `GET /api/users/{userId}/players` route for player-based team queries (already existed)
- [x] 6.5 Update Player-related route validation schemas to include `status` field
- [x] 6.6 Update `AcceptInvitationUseCase` caller to also set `Profile.activeTeamId`

## 7. Legacy System Removal

- [x] 7.1 Delete `GET/PATCH /api/users/teams` route files (done in 3b.4)
- [x] 7.2 Delete `useUserTeams` SWR hook from `src/hooks/use-data.ts`
- [x] 7.3 Delete `ConfirmInvitation` component (done in 3b.8)
- [x] 7.4 Remove all imports and references to deleted modules across codebase

## 8. UI Components — Invitation Flow

- [x] 8.1 Rewrite `InviteSection` — replace email input with user search UI (button-triggered fetch, not SWR), display found user info or unregistered message
- [x] 8.2 Update `InvitedSection` — show user info (avatar, name) for userId-based invites, show email for email-based invites
- [x] 8.3 Update `InvitationList` — change filter to `player.status === INVITED` (done in 3b.2)
- [x] 8.4 Rewrite `Invitations` page — data source from player-based SWR query, filter INVITED
- [x] 8.5 Rewrite `Menu` component — team list from player-based SWR query, team switch via `PATCH /api/profiles` (activeTeamId)
- [x] 8.6 Add Leave Team UI — button at bottom of team info page with confirmation dialog

## 9. UI Components — activeTeamId Migration

- [x] 9.1 Update `NavLinks` — replace `profile?.teams?.joined?.[0]` with `profile.activeTeamId` (done in 3b.7)
- [x] 9.2 Update `Home` — replace `profile?.teams?.joined?.[0]` with `profile.activeTeamId` (done in 3b.7)
- [x] 9.3 Update `Notifications` — replace `profile?.teams?.joined[0]` with `profile.activeTeamId` (done in 3b.7)
- [x] 9.4 Implement frontend fallback logic — when `activeTeamId` is null or invalid, fallback to first JOINED player's teamId or show onboarding

## 10. SWR Hooks

- [x] 10.1 Create or adjust player-based SWR hook for fetching user's players (joined + invited teams)
- [x] 10.2 Ensure all components consuming team data use the new hook instead of removed `useUserTeams`

## Post-Review Fixes

> Discovered during code review of player-invitations branch vs dev.

- [x] R1. Fix `PlayerRepositoryImpl.update()` — `undefined` values silently ignored by Mongoose; split into `$set`/`$unset` operations
- [x] R2. Fix `LeaveTeamUseCase` — clear `profile.activeTeamId` when it points to the team being left; route `leave` action through controller
- [x] R3. Fix `existsInvitation` query — replace legacy `userId: { $exists: false }` with `status: PlayerStatus.INVITED`
- [x] R4. Fix `GetUserByIdUseCase` — return full `User` entity for self-lookup instead of truncated `SearchUserOutput`
- [ ] R5. (deferred) Accept/RejectInvitationUseCase lack authorization check (IDOR risk) — tracked for future change
- [ ] R6. (deferred) AppError `httpStatus` centralization — extract `ERROR_STATUS` mapping from routes into AppError class

## 11. Verification

- [x] 11.1 Run `npm test` — all tests pass (496 passed)
- [x] 11.2 Run `npm run lint` — pre-existing lint errors only, no new errors introduced
- [x] 11.3 Run `npm run build` — build succeeds without errors
- [x] 11.4 Manual smoke test: create team → invite registered user → accept → switch team → leave team
- [x] 11.5 Manual smoke test: invite unregistered email → register new user → verify invitation auto-linked
