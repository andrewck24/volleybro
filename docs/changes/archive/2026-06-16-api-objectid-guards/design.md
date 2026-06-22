## Context

All API route handlers in this project that accept a MongoDB ObjectId as a URL path segment
should validate that segment before any side-effectful call. Only `teams/[teamId]/route.ts`
currently does this via a local `assertValidObjectId` function. Ten other handlers pass the
raw path string to the authorization or database layer, where an invalid string causes a
`BSONError` that surfaces as an unhandled 500.

## Goals / Non-Goals

**Goals:**

- Single source of truth for ObjectId format validation at the route boundary
- Consistent 400 response with `code: "VALIDATION"` for all ObjectId path params
- Zero side-effects (no DB connection, no auth check) when the path param is invalid

**Non-Goals:**

- `users/[userId]` routes — `userId` is a Better Auth string, not a MongoDB ObjectId
- Changing `translateRepositoryError` to catch `BSONError`
- Any validation beyond format (`/^[0-9a-fA-F]{24}$/`) — existence checks remain in controllers

## Decisions

**New file `src/lib/api/guards.ts`**

Defines and exports `assertObjectId(id: string, param?: string): void`. Lives in
`src/lib/api/` alongside `wrappers.ts` because it is a request-boundary enforcement
utility, not a Zod schema.

Throws `ValidationError(CommonReason.INVALID_INPUT, "Invalid <param> format")` on
mismatch. The `param` argument (default `"id"`) names the segment in the error message
(e.g. `"Invalid teamId format"`, `"Invalid gameId format"`).

The regex `/^[0-9a-fA-F]{24}$/` is identical to the one already in `[teamId]/route.ts`
and in `game.repository.mongo.ts` (for the `lastId` cursor check). Moving it to a single
location removes the duplication.

**Caller convention**

Each handler calls `assertObjectId` immediately after `const { xId } = await props.params`,
before `connectToMongoDB` and before any authorization check. Placement before
`connectToMongoDB` avoids unnecessary connection overhead on invalid requests.

**Refactor of `[teamId]/route.ts`**

The local `OBJECT_ID_RE` constant and `assertValidObjectId` function are removed. Both
`GET` and `PATCH` handlers import and call `assertObjectId` from `src/lib/api/guards.ts`.
Observable behavior is unchanged.

## Implementation Contract

**Shared guard function**

```ts
// src/lib/api/guards.ts
export function assertObjectId(id: string, param = "id"): void
```

- Throws `ValidationError(CommonReason.INVALID_INPUT, "Invalid <param> format")` when
  `id` does not match `/^[0-9a-fA-F]{24}$/`
- Returns `void` on valid input

**Error shape** (produced by `withErrorHandler` catching `ValidationError`):

```json
{ "code": "VALIDATION", "reason": "INVALID_INPUT", "detail": "Invalid teamId format" }
```

HTTP status: 400. Shape is identical to the existing team route 400 responses.

**Acceptance criteria**

- `pnpm typecheck` passes with no new errors
- `pnpm test` passes (existing tests for `[teamId]/route.ts` that assert 400 on invalid
  teamId must still pass after the refactor)
- New unit tests in `src/lib/api/__tests__/guards.test.ts` cover valid input (no throw)
  and invalid inputs (throws with correct message and error type)

## Risks / Trade-offs

**Low risk**: The guard is a pure function with no external dependencies. Each call site
change is a one-liner insertion. The only risk is forgetting a handler — the acceptance
criteria test suite mitigates this for the covered routes.

**`game.repository.mongo.ts` duplication**: The repository also has a local
`/^[0-9a-fA-F]{24}$/.test(lastId)` check for cursor-based pagination. That check is
inside the infrastructure layer (not a route boundary concern) and is intentionally left
as-is — refactoring it is out of scope.
