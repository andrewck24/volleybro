## Context

`TeamRepositoryImpl.toTeam` and `mapLineupPlayer` already map Mongoose `_id` to the `id` field that `TeamView` / `LineupView` declare, and the create flow already uses route → controller → use case → repository (`createTeamController` → `CreateTeamUseCase` → `ITeamRepository.create`). However, three team endpoints bypass this entirely and return the raw Mongoose document:

- `GET /api/teams/[teamId]` calls `Team.findById` and returns the doc directly.
- `PATCH /api/teams/[teamId]` mutates `name` / `nickname` on the doc and returns it.
- `PATCH /api/teams/[teamId]/lineups` assigns `team.lineups = <client payload>` and returns the raw subdocument array.

Because `apiClient` does not re-validate responses, the declared `id` fields are absent at runtime (`_id` is sent instead). This is the root cause of `PATCH /api/teams/undefined/lineups` 500s, the lineup UI rendering assigned players as empty, and a broken lineup save round-trip. A surgical frontend fix (using the `teamId` prop) has already removed the immediate 500; this change addresses the architectural root cause.

The lineup save path has a second hazard: the client sends lineup players keyed by `id`, but the Mongoose lineup subschemas key players by `_id`. Assigning the client payload directly causes Mongoose to ignore the unknown `id` and generate fresh `_id` values for every array subdocument, silently corrupting player references.

## Goals / Non-Goals

**Goals:**

- Serve `GET /api/teams/[teamId]`, `PATCH /api/teams/[teamId]`, and `PATCH /api/teams/[teamId]/lineups` through route → controller → use case → repository, reusing the existing repository mapping as the single source of truth.
- Guarantee every response conforms to `TeamView` / `LineupView`: team `id` present, and every lineup `player.id` present as a string or `null` for empty slots.
- Persist lineups with correct `id ↔ _id` round-tripping so player references survive a save and reload.

**Non-Goals:**

- No Zod response validation added to `apiClient`.
- No migration of non-team raw routes (games, players) to Clean Architecture.
- No change to the MongoDB schema, the `TeamView` / `LineupView` Zod shapes, or the frontend wire contract.
- No re-doing of the already-applied surgical fix in the lineup component.

## Decisions

### Route team read and update endpoints through controllers and use cases

Each of the three endpoints gets a thin use case (`GetTeamUseCase`, `UpdateTeamUseCase`, `UpdateTeamLineupsUseCase`) resolved via a controller (`getTeamController`, `updateTeamController`, `updateTeamLineupsController`), mirroring `createTeamController` / `CreateTeamUseCase`. The use cases delegate to `ITeamRepository`; the routes keep their authorization and validation responsibilities. Rationale: the create flow already establishes this layering, so uniform team routes are the least-surprising choice and keep the `_id → id` mapping in exactly one place.

Alternatives considered: (a) a Mongoose `toJSON` transform on the team schema — rejected because it forks a second mapping path divergent from the repository, and is fragile for nested lineup-player subdocuments which would each need their own transform; (b) routes calling `ITeamRepository` directly via the DI container — rejected because the project standardizes on controllers/use cases for team write paths and the user requires full Clean Architecture layering for team routes.

### Bidirectional id-to-objectid mapping for lineup persistence

Add `ITeamRepository.updateLineups(teamId, lineups)` returning the persisted lineups mapped back to `id`. On write it maps each player `id` (string) to a Mongoose `_id` (ObjectId), and each `sub.id` likewise; on read it reuses the existing `mapLineupPlayer`. Empty starting slots arrive as `id: null` and MUST be persisted as `_id: null` — they MUST NOT receive a generated ObjectId, otherwise the lineup UI's `player.id`-truthiness checks would treat empty slots as filled. Rationale: the client contract is `id`-keyed and the schema is `_id`-keyed; an explicit inverse mapping is the only way to avoid Mongoose regenerating subdocument `_id`s and losing references.

### Persist lineups via findByIdAndUpdate returning the mapped result

`updateLineups` uses `findByIdAndUpdate(teamId, { lineups: <mapped> }, { new: true })`, throwing `NotFoundError` when the team is absent, then returns `toTeam(doc).lineups`. Rationale: this matches the existing `update` method's shape (so the mocked repository test harness in `team.repository.test.ts` extends naturally) and yields a document the existing `toTeam` mapping converts back to `id`-keyed lineups.

### Keep authorization and input guards in the route layer

Routes retain `assertValidObjectId`, `withErrorHandler` / `withAuth`, `verifyIsTeamAdmin` (team PATCH), and `verifyTeamRole(..., MEMBER)` (lineups PATCH) before invoking the controller, and continue to call `connectToMongoDB()` (the repository does not manage connections). Rationale: this mirrors how the existing routes and the create route split responsibilities (route = auth/validation/connection, use case = orchestration), avoiding behavior changes to access control.

## Implementation Contract

**Behavior:**

- `GET /api/teams/[teamId]` returns JSON where `id` equals the team's hex ObjectId string, and every `lineups[].starting|liberos|substitutes[].id` is a hex string or `null`.
- `PATCH /api/teams/[teamId]` (admin only) updates `name` and/or `nickname` and returns the same `id`-bearing shape.
- `PATCH /api/teams/[teamId]/lineups` (MEMBER+) persists the submitted lineups and returns the saved lineups with player `id`s preserved (filled slots keep their original player `id`; empty slots return `id: null`).

**Interface / data shape:**

- `ITeamRepository.updateLineups(teamId: string, lineups: Lineup[]): Promise<Lineup[]>` added to the interface and implemented in `TeamRepositoryImpl`.
- New controllers: `getTeamController(teamId)`, `updateTeamController(teamId, { name?, nickname? })`, `updateTeamLineupsController(teamId, lineups)`.
- New use cases bound in the DI container with new `TYPES` symbols: `GetTeamUseCase`, `UpdateTeamUseCase`, `UpdateTeamLineupsUseCase`.

**Failure modes:**

- Missing team → `NotFoundError` (existing 404 behavior) for all three endpoints.
- Invalid ObjectId on the team routes → `ValidationError` via `assertValidObjectId` (existing 400 behavior).
- Authorization failure → existing `AuthorizationError` from the auth service; access-control outcomes are unchanged.

**Acceptance criteria:**

- A new/extended test in `src/infrastructure/db/repositories/__tests__/team.repository.test.ts` asserts `updateLineups` maps a filled player `id` to an ObjectId on write and back to the same `id` string on read, and preserves an empty slot as `id: null` (no generated ObjectId).
- Existing team route tests in `src/app/api/teams/[teamId]/__tests__/route.test.ts` continue to pass with responses now exposing `id`.
- Manual verification: saving a lineup with at least one assigned player succeeds (no `undefined` in the URL), and reloading the team shows the player still assigned.

**Scope boundaries:**

- In scope: the three named team endpoints, the `updateLineups` repository method + interface, three use cases + controllers, DI bindings, and the repository unit test.
- Out of scope: `apiClient` validation, non-team routes, schema changes, frontend component changes beyond the already-applied surgical fix.

## Risks / Trade-offs

- [Mongoose generates `_id` for empty lineup slots, making them appear filled] → Explicitly map `id: null` to `_id: null` in the write mapper and add a repository test asserting empty slots round-trip as `id: null`.
- [Thin pass-through use cases add ceremony with no business logic] → Accepted deliberately to satisfy the requirement that all team routes use full Clean Architecture layering and to keep the mapping centralized; the cost is three small files mirroring an existing pattern.
- [Repository tests mock Mongoose, so real subdocument `_id` regeneration is not exercised by unit tests] → The write mapper makes the `id → _id` conversion explicit (independent of Mongoose defaults), and manual verification covers the real persistence round-trip.
