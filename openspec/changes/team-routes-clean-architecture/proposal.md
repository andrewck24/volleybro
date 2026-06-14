## Why

Three team API routes bypass the repository layer and return the raw Mongoose document directly. Mongoose serializes the document with `_id` (not the `id` field that `TeamView` / `LineupView` declare), and the client `apiClient` does not re-validate the response with Zod. The result is a runtime/type divergence: `team.id` and lineup `player.id` are `undefined` at runtime even though the types claim they exist. This already produced a 500 (`PATCH /api/teams/undefined/lineups`) on the lineup save flow, and silently breaks the lineup UI (assigned players render as empty) and the lineup save round-trip. The existing `TeamRepositoryImpl.toTeam` / `mapLineupPlayer` already perform the correct `_id → id` mapping, so the fix is to route these endpoints through the existing Clean Architecture layers instead of inventing a second, divergent mapping path.

## What Changes

- Route the three raw team endpoints through the established route → controller → use case → repository layering, matching the existing `createTeamController` pattern:
  - `GET /api/teams/[teamId]` (currently calls `Team.findById` and returns the raw doc)
  - `PATCH /api/teams/[teamId]` (team name/nickname update; currently mutates and returns the raw doc)
  - `PATCH /api/teams/[teamId]/lineups` (currently assigns `team.lineups` and returns the raw subdocument array)
- Add a `getTeam` use case + controller wrapping `ITeamRepository.findById`.
- Add an `updateTeam` use case + controller wrapping `ITeamRepository.update` for name/nickname.
- Add an `updateTeamLineups` use case + controller, backed by a new `ITeamRepository.updateLineups` method that performs **bidirectional** `id ↔ _id` mapping: client sends `id`, the Mongoose schema stores `_id`. Without explicit mapping, Mongoose regenerates fresh `_id` values for array subdocuments and loses player references; empty slots (`id: null`) must remain `_id: null` and must not be assigned a generated ObjectId.
- All three routes return payloads conforming to `TeamView` / `LineupView` (every team and lineup `player.id` present as a string, `null` for empty slots), so the lineup UI and post-save `mutate` cache receive correct `id` values.
- Preserve existing authorization semantics: `GET` is public via `withErrorHandler`; team `PATCH` requires team admin via `verifyIsTeamAdmin`; lineups `PATCH` requires `MEMBER` role via `verifyTeamRole`. Existing `assertValidObjectId` / `NotFoundError` behavior is retained.

## Non-Goals

- This change does NOT introduce Zod response validation in `apiClient`; correctness is guaranteed by the repository mapping, not by client-side parsing.
- This change does NOT migrate other raw routes outside the three team endpoints listed above (e.g. games, players) to Clean Architecture; those are separate follow-ups.
- This change does NOT alter the MongoDB schema, the `TeamView` / `LineupView` Zod shapes, or the wire contract consumed by the frontend.
- The surgical frontend fix already applied (`src/components/team/lineup/index.tsx` using the `teamId` prop instead of `team!.id`) is the immediate stopgap and is not re-done here.

## Capabilities

### New Capabilities

- `team-data-access`: Reading and updating a team (and its embedded lineups) through the Clean Architecture layers, guaranteeing that API responses expose stable string `id` values (mapped from Mongoose `_id`) for the team and for every lineup player, including correct `id ↔ _id` round-tripping on lineup persistence.

### Modified Capabilities

(none)

## Impact

- Affected specs: new `team-data-access` capability.
- Affected code:
  - New:
    - src/applications/usecases/team/get-team.usecase.ts
    - src/applications/usecases/team/update-team.usecase.ts
    - src/applications/usecases/team/update-team-lineups.usecase.ts
    - src/interface/controllers/team/get-team.controller.ts
    - src/interface/controllers/team/update-team.controller.ts
    - src/interface/controllers/team/update-team-lineups.controller.ts
  - Modified:
    - src/app/api/teams/[teamId]/route.ts
    - src/app/api/teams/[teamId]/lineups/route.ts
    - src/applications/repositories/team.repository.interface.ts
    - src/infrastructure/db/repositories/team.repository.mongo.ts
    - src/infrastructure/di/types.ts
    - src/infrastructure/di/inversify.config.ts
    - src/infrastructure/db/repositories/__tests__/team.repository.test.ts
  - Removed: (none)
