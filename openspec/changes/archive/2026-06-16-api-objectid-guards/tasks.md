## 1. Shared Guard Module

- [x] 1.1 Implement the "ObjectId path parameters validated before handler logic" requirement: create `src/lib/api/guards.ts` exporting `assertObjectId(id: string, param?: string): void` that throws `ValidationError(CommonReason.INVALID_INPUT, "Invalid <param> format")` when `id` does not match `/^[0-9a-fA-F]{24}$/` and returns void for valid 24-character hex strings. Verified by task 1.2 unit tests passing.

- [x] 1.2 `src/lib/api/__tests__/guards.test.ts` unit tests for `assertObjectId`: valid 24-char hex (no throw), 23-char hex (throws ValidationError), 25-char hex (throws), non-hex chars (throws), `"undefined"` (throws), error detail includes the `param` argument. Verified by `pnpm test src/lib/api/__tests__/guards.test.ts` passing.

## 2. Refactor Existing Team Route

- [x] 2.1 Satisfy "Guard applied consistently across all ObjectId routes" for `src/app/api/teams/[teamId]/route.ts`: import `assertObjectId` from `src/lib/api/guards.ts`, remove the local `OBJECT_ID_RE` constant and `assertValidObjectId` function, and call `assertObjectId(teamId, "teamId")` in both `GET` and `PATCH` handlers. Existing tests that assert 400 on invalid teamId pass (`pnpm test src/app/api/teams`).

## 3. Apply Guard to Team Sub-Routes

- [x] [P] 3.1 Satisfy "Guard applied consistently across all ObjectId routes" for `src/app/api/teams/[teamId]/lineups/route.ts`: call `assertObjectId(teamId, "teamId")` immediately after `const { teamId } = await props.params`, before `connectToMongoDB` and `authorizationService.verifyTeamRole`. Verified by task 5.1 test and `pnpm test src/app/api/teams` passing.

- [x] [P] 3.2 Satisfy "Guard applied consistently across all ObjectId routes" for `src/app/api/teams/[teamId]/ownership/route.ts`: call `assertObjectId(teamId, "teamId")` immediately after `const { teamId } = await props.params`, before body parsing and the ownership controller. Verified by `pnpm test src/app/api/teams` passing.

- [x] [P] 3.3 Satisfy "Guard applied consistently across all ObjectId routes" for `src/app/api/teams/[teamId]/players/route.ts`: call `assertObjectId(teamId, "teamId")` in both `POST` and `GET` handlers immediately after `const { teamId } = await props.params`, before any body parsing or controller call. Verified by `pnpm test src/app/api/teams` passing.

## 4. Apply Guard to Game and Player Routes

- [x] [P] 4.1 Satisfy "Guard applied consistently across all ObjectId routes" for `src/app/api/games/[gameId]/route.ts`: call `assertObjectId(gameId, "gameId")` immediately after `const { gameId } = await props.params`, before `connectToMongoDB`. Verified by `pnpm typecheck` passing.

- [x] [P] 4.2 Satisfy "Guard applied consistently across all ObjectId routes" for `src/app/api/games/[gameId]/sets/route.ts`: call `assertObjectId(gameId, "gameId")` in both `GET` and `POST` handlers before any DB or controller call. Verified by `pnpm typecheck` passing.

- [x] [P] 4.3 Satisfy "Guard applied consistently across all ObjectId routes" for `src/app/api/games/[gameId]/sets/rallies/route.ts`: call `assertObjectId(gameId, "gameId")` in both `POST` and `DELETE` handlers before any DB or controller call. Verified by `pnpm typecheck` passing.

- [x] [P] 4.4 Satisfy "Guard applied consistently across all ObjectId routes" for `src/app/api/games/[gameId]/sets/substitutions/route.ts`: call `assertObjectId(gameId, "gameId")` in the `POST` handler before any DB or controller call. Verified by `pnpm typecheck` passing.

- [x] [P] 4.5 Satisfy "Guard applied consistently across all ObjectId routes" for `src/app/api/players/[playerId]/route.ts`: call `assertObjectId(playerId, "playerId")` in `GET`, `PATCH`, and `DELETE` handlers immediately after `const { playerId } = await props.params`. Verified by `pnpm typecheck` passing.

- [x] [P] 4.6 Satisfy "Guard applied consistently across all ObjectId routes" for `src/app/api/players/[playerId]/invitations/route.ts`: call `assertObjectId(playerId, "playerId")` in the `PATCH` handler before any controller call. Verified by `pnpm typecheck` passing.

- [x] [P] 4.7 Satisfy "Guard applied consistently across all ObjectId routes" for `src/app/api/players/[playerId]/memberships/route.ts`: call `assertObjectId(playerId, "playerId")` in `POST`, `PATCH`, and `DELETE` handlers before any controller call. Verified by `pnpm typecheck` passing.

## 5. Extend Existing Tests

- [x] 5.1 `src/app/api/teams/[teamId]/lineups/__tests__/route.test.ts` adds a test asserting that `PATCH` with `teamId = "bad-id"` returns status 400 with `code: "VALIDATION"` and does not call `mockUpdateTeamLineupsController`. Verified by `pnpm test src/app/api/teams` passing.
