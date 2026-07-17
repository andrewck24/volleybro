## Summary

Extract a shared `assertObjectId` guard for MongoDB ObjectId path-parameter validation and apply it to all API routes that accept an ObjectId segment but currently perform no format check.

## Motivation

Only `src/app/api/teams/[teamId]/route.ts` validates the `teamId` path segment against the ObjectId format before using it. Ten other route handlers that accept `teamId`, `gameId`, or `playerId` pass the raw path string directly into the service/authorization/repository layer. When a caller sends a syntactically invalid string (e.g. `"undefined"`, `"bad-id"`), Mongoose constructs `new Types.ObjectId(id)` and throws a `BSONError`. `translateRepositoryError` does not recognise `BSONError`, so the error falls through to a generic 500 — masking an input error that should be a 400.

## Proposed Solution

1. Create `src/lib/api/guards.ts` with an exported `assertObjectId(id, param?)` function that throws `ValidationError(400)` when the string is not a 24-character hex ObjectId.
2. Apply `assertObjectId` as the first call in every handler that uses an ObjectId path segment.
3. Refactor `src/app/api/teams/[teamId]/route.ts` to import from the new shared module instead of its local copy.

## Non-Goals

- `src/app/api/users/[userId]/players/route.ts` is excluded — `userId` is a Better Auth string identifier, not a MongoDB ObjectId, and is validated by identity comparison against the session user, not by DB lookup.
- Changing `translateRepositoryError` to catch `BSONError` — input validation belongs at the request boundary, not the infrastructure layer.
- Adding ObjectId validation to frontend client code.

## Alternatives Considered

**Teach `translateRepositoryError` about `BSONError`**: rejected — this hides a validation concern inside the infrastructure layer and produces generic error messages that do not identify which parameter was malformed.

**`withValidatedParams(schema)` wrapper factory**: rejected — requires the wrapper to understand Next.js async `props.params` destructuring, adding complexity with no benefit over a one-line `assertObjectId` call.

## Impact

- Affected specs: none (defensive hardening only, no new capabilities)
- Affected code:
  - New: `src/lib/api/guards.ts`
  - Modified: `src/app/api/teams/[teamId]/route.ts`
  - Modified: `src/app/api/teams/[teamId]/lineups/route.ts`
  - Modified: `src/app/api/teams/[teamId]/ownership/route.ts`
  - Modified: `src/app/api/teams/[teamId]/players/route.ts`
  - Modified: `src/app/api/games/[gameId]/route.ts`
  - Modified: `src/app/api/games/[gameId]/sets/route.ts`
  - Modified: `src/app/api/games/[gameId]/sets/rallies/route.ts`
  - Modified: `src/app/api/games/[gameId]/sets/substitutions/route.ts`
  - Modified: `src/app/api/players/[playerId]/route.ts`
  - Modified: `src/app/api/players/[playerId]/invitations/route.ts`
  - Modified: `src/app/api/players/[playerId]/memberships/route.ts`
  - Modified: `src/app/api/teams/[teamId]/__tests__/route.test.ts`
  - New: `src/lib/api/__tests__/guards.test.ts`
