## 1. Repository layer — lineup persistence mapping

- [ ] 1.1 Add `updateLineups(teamId, lineups)` to `ITeamRepository` and implement it in `TeamRepositoryImpl`, applying the **Bidirectional id-to-objectid mapping for lineup persistence** (each player `id`/`sub.id` → ObjectId on write, `_id` → `id` on read; `id: null` empty slots stored and returned as `id: null`, never a generated ObjectId) and **Persist lineups via findByIdAndUpdate returning the mapped result** (use `findByIdAndUpdate(..., { new: true })`, throw `NotFoundError` when absent, return `toTeam(doc).lineups`). Behavior: a saved lineup returns `LineupView`-shaped data with player `id`s preserved. Verify: `npx tsc --noEmit` passes for the repository and interface.
- [ ] 1.2 Add a unit test in `src/infrastructure/db/repositories/__tests__/team.repository.test.ts` covering **Lineup persistence round-trips player identifiers**: assert a filled slot's `id` maps to an ObjectId on write and back to the same `id` string on read, and an empty slot submitted as `id: null` returns `id: null` with no generated ObjectId. Verify: `pnpm test team.repository` passes.

## 2. Application + interface layers — use cases and controllers

- [ ] 2.1 [P] Add `GetTeamUseCase` (delegating to `ITeamRepository.findById`) and `getTeamController`, applying **Route team read and update endpoints through controllers and use cases**. Behavior: calling the controller returns a `Team` with `id` present or `null` when absent. Verify: `npx tsc --noEmit` passes.
- [ ] 2.2 [P] Add `UpdateTeamUseCase` (delegating to `ITeamRepository.update` for `name`/`nickname`) and `updateTeamController`, applying **Route team read and update endpoints through controllers and use cases**. Behavior: calling the controller returns the updated `Team` with `id` present. Verify: `npx tsc --noEmit` passes.
- [ ] 2.3 Add `UpdateTeamLineupsUseCase` (delegating to `ITeamRepository.updateLineups` from task 1.1) and `updateTeamLineupsController`, applying **Route team read and update endpoints through controllers and use cases**. Behavior: calling the controller returns the persisted lineups with player `id`s. Verify: `npx tsc --noEmit` passes.

## 3. Dependency injection wiring

- [ ] 3.1 Register `GetTeamUseCase`, `UpdateTeamUseCase`, and `UpdateTeamLineupsUseCase` with new symbols in `src/infrastructure/di/types.ts` and bind them in `src/infrastructure/di/inversify.config.ts`. Behavior: `container.get` resolves each use case without a binding error. Verify: `pnpm test` suite that exercises the container passes (or `npx tsc --noEmit` plus a successful build).

## 4. Route layer — wire endpoints through controllers, preserve guards

- [ ] 4.1 Update `GET /api/teams/[teamId]` to delegate to `getTeamController`, satisfying **Team read responses expose stable string identifiers** while applying **Keep authorization and input guards in the route layer** (retain `assertValidObjectId`, `withErrorHandler`, `connectToMongoDB`, and the not-found behavior). Behavior: the response exposes team `id` and lineup player `id`s, never raw `_id`. Verify: `pnpm test` for `src/app/api/teams/[teamId]/__tests__/route.test.ts` passes.
- [ ] 4.2 Update `PATCH /api/teams/[teamId]` to delegate to `updateTeamController`, satisfying **Team name and nickname updates return mapped identifiers** while applying **Keep authorization and input guards in the route layer** (retain `assertValidObjectId`, `withAuth`, `verifyIsTeamAdmin`, `connectToMongoDB`). Behavior: an admin update returns the team with `id` present; non-admins are rejected as before. Verify: `pnpm test` for the team route test passes.
- [ ] 4.3 Update `PATCH /api/teams/[teamId]/lineups` to delegate to `updateTeamLineupsController`, satisfying **Lineup persistence round-trips player identifiers** while applying **Keep authorization and input guards in the route layer** (retain `withAuth`, `verifyTeamRole(..., MEMBER)`, `connectToMongoDB`). Behavior: a member save returns `LineupView`-shaped lineups with player `id`s preserved. Verify: saving a lineup with an assigned player and reloading shows the player still assigned (manual), and `pnpm test` passes.

## 5. Final verification

- [ ] 5.1 Run `pnpm test`, `npx tsc --noEmit`, and `pnpm lint` and confirm all pass; manually verify the lineup save/reload round-trip in the running app. Behavior: the full suite is green and a saved lineup survives reload. Verify: command output shows zero failures.
