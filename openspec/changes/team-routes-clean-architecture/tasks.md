## 1. Schema — rename player reference to playerId

- [x] 1.1 [P] In `src/infrastructure/db/mongoose/schemas/team.ts`, apply **Rename embedded player reference from _id to nullable playerId in the shared schema**: change the player reference on `startingPlayerSchema`, `liberoPlayerSchema`, `substitutePlayerSchema`, and `subSchema` from `_id` to `playerId: { type: ObjectId, ref: "Player", default: null }` (keep `{ _id: false }`), and update the `LineupDocument` interface. Behavior: an empty slot can persist as `{ playerId: null }`. Verify: `npx tsc --noEmit` passes.
- [x] 1.2 [P] In `src/infrastructure/db/mongoose/schemas/game.ts`, apply the same rename to `playerSchema`, `staffSchema`, and `rallyDetailSchema.player` (`_id → playerId`, add `{ _id: false }`); `sets[].lineups` and `teams.{side}.lineup` inherit the shared `lineupSchema` automatically. Behavior: game embedded player references use `playerId`. Verify: `npx tsc --noEmit` passes.

## 2. Team repository — bidirectional mapping and lineup persistence

- [x] 2.1 In `team.repository.mongo.ts`, apply **Bidirectional player-reference mapping in the repository layer**: `mapLineupPlayer` reads `playerId` (and `sub.playerId`) → domain `id`; add a write mapper (`toLineupPlayerDoc`/`toLineupDoc`) converting domain `id → playerId` and emitting an object slot `{ playerId: null, position }` for empty slots. Behavior: read yields `id`, write yields `playerId`, empty slot is an object not a bare null. Verify: `npx tsc --noEmit` passes.
- [x] 2.2 Add `updateLineups(teamId, lineups)` to `ITeamRepository` and implement it, applying **Persist lineups via findByIdAndUpdate returning the mapped result** (`findByIdAndUpdate(..., { new: true })`, throw `NotFoundError` when absent, return `toTeam(doc).lineups`). Behavior: saved lineups return `LineupView` data with player `id`s. Verify: `npx tsc --noEmit` passes.
- [x] 2.3 Update `removePlayerFromLineups` to satisfy **Removing a player clears its lineup references**: `$pull` lineup arrays by `playerId` instead of `_id`. Behavior: a removed player is pulled from every lineup array. Verify: `pnpm test team.repository` passes.
- [x] 2.4 Add a unit test in `src/infrastructure/db/repositories/__tests__/team.repository.test.ts` covering **Lineup persistence round-trips player identifiers**: a filled slot `id` maps to `playerId` on write and back to the same `id` on read; an empty slot returns `id: null` as an object slot. Verify: `pnpm test team.repository` passes.

## 3. Game repository — centralize read/write mapping

- [x] 3.1 In `game.repository.mongo.ts`, extend `toGame` for **Centralize game read and write mapping in the game repository** and **Game read responses expose stable player identifiers**: map every embedded player reference (set lineups, `teams.{side}.players`/`staffs`, `rallyDetail.player`, substitution `players.in/out`) `playerId`/ObjectId → domain `id`; empty lineup slot → `id: null`. Behavior: a read game exposes string `id`s on all embedded players. Verify: `npx tsc --noEmit` passes.
- [x] 3.2 Add a `toGameDoc` write mapper and apply it in `create`/`update` to satisfy **Game persistence stores client identifiers as references**: map domain `id → playerId` (excluding the top-level id from `$set`). Behavior: client `id`s persist as `playerId` and round-trip on read. Verify: `pnpm test game.repository` passes.
- [x] 3.3 Add a unit test in `src/infrastructure/db/repositories/__tests__/game.repository.test.ts` asserting `toGame` exposes nested player `id`s and `toGameDoc` persists client `id`s as `playerId`. Verify: `pnpm test game.repository` passes.

## 4. Team routes via Clean Architecture

- [x] 4.1 [P] Add `GetTeamUseCase` (delegating to `ITeamRepository.findById`) and `getTeamController`, applying **Route team endpoints through controllers and use cases**. Behavior: the controller returns a `Team` with `id` or `null`. Verify: `npx tsc --noEmit` passes.
- [x] 4.2 [P] Add `UpdateTeamUseCase` (delegating to `ITeamRepository.update`) and `updateTeamController`. Behavior: the controller returns the updated `Team` with `id`. Verify: `npx tsc --noEmit` passes.
- [x] 4.3 Add `UpdateTeamLineupsUseCase` (delegating to `updateLineups` from task 2.2) and `updateTeamLineupsController`. Behavior: the controller returns persisted lineups with player `id`s. Verify: `npx tsc --noEmit` passes.
- [x] 4.4 Register the three use cases with new symbols in `src/infrastructure/di/types.ts` and bind them in `src/infrastructure/di/inversify.config.ts`. Behavior: `container.get` resolves each without a binding error. Verify: `pnpm build` succeeds.
- [x] 4.5 Wire `GET /api/teams/[teamId]` to `getTeamController`, satisfying **Team read responses expose stable string identifiers** while applying **Keep authorization and input guards in the route layer** (retain `assertValidObjectId`, `withErrorHandler`, `connectToMongoDB`, not-found behavior). Behavior: response exposes team and lineup player `id`s, never raw `playerId`/`_id`. Verify: `pnpm test` for `src/app/api/teams/[teamId]/__tests__/route.test.ts` passes.
- [x] 4.6 Wire `PATCH /api/teams/[teamId]` to `updateTeamController`, satisfying **Team name and nickname updates return mapped identifiers** (retain `withAuth`, `verifyIsTeamAdmin`, `assertValidObjectId`, `connectToMongoDB`). Behavior: admin update returns team with `id`; non-admins rejected. Verify: `pnpm test` for the team route test passes.
- [x] 4.7 Wire `PATCH /api/teams/[teamId]/lineups` to `updateTeamLineupsController` (retain `withAuth`, `verifyTeamRole(..., MEMBER)`, `connectToMongoDB`). Behavior: a member save returns `LineupView`s with player `id`s preserved; reload shows the player still assigned. Verify: manual lineup save/reload plus `pnpm test`.

## 5. Migration — audit first, then convert

- [ ] 5.1 Add `scripts/migrations/lineup-player-id.audit.ts` applying **Audit-first one-time migration with resolve-by-existence** and part of **Existing embedded references migrate to the playerId field**: dry-run scan of `teams.lineups[]` and `games.{teams.*, sets[].lineups.*}` reporting counts of legacy `_id` slots, slots resolving to a Player/snapshot, and empty slots; makes no writes. Verify: running the script prints a report and the database is unchanged.
- [ ] 5.2 Add `scripts/migrations/lineup-player-id.migrate.ts` completing **Existing embedded references migrate to the playerId field**: rename legacy `_id → playerId`, normalize empty slots to `{ playerId: null, position }`, leave `substitution.players.in/out` intact; idempotent (re-run makes no changes). Verify: a second run reports zero modifications.

## 6. Final verification

- [ ] 6.1 Run `pnpm test`, `npx tsc --noEmit`, `pnpm lint`, and `pnpm build`; manually verify lineup save/reload and create-game roster in the running app. Behavior: full suite green; a saved lineup and a created game both retain player references. Verify: command output shows zero failures.
