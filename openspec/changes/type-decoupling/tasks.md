## 1. Mechanical rename: `Record` → `Game`, `_id` → `id`, file/directory/URL paths

All layers touched simultaneously via find-replace. No logic changes. Implements the `Record` renamed to `Game` with full path migration decision, the match namespace clarification: game-result/review concepts renamed decision, the unified game page route structure decision, and the API endpoint consolidation for game summaries decision.

- [x] 1.1 Rename entity file `src/entities/record.ts` → `game.ts`. Rename type `Record` → `Game`, all `_id: string` → `id: string` in every entity type (`Game`, `Player`, `Staff`, `Team`, `MatchResult`, `RallyDetail`, `LineupPlayer`), `team_id` → `teamId` in `Game`. Update `src/entities/player.ts`, `team.ts`, `user.ts`, `profile.ts` with `id` instead of `_id`. Rename `src/entities/errors/reasons/record.ts` → `game.ts`, `RecordReason` → `GameReason` (domain-scoped reason enums requirement).
- [x] 1.2 Rename application layer paths and types: `src/applications/repositories/record.repository.interface.ts` → `game.repository.interface.ts` (rename `IRecordRepository` → `IGameRepository`); `src/applications/usecases/record/` → `game/`. Update all `Record`/`_id`/`team_id`/`RecordReason` references in use case and repository interface files.
- [x] 1.3 Rename infrastructure paths and types: `src/infrastructure/db/mongoose/schemas/record.ts` → `game.ts` (`RecordDocument` → `GameDocument`, model name `"Record"` → `"Game"`, collection `"records"` → `"games"`); `src/infrastructure/db/repositories/record.repository.mongo.ts` → `game.repository.mongo.ts` (`RecordRepositoryImpl` → `GameRepositoryImpl`); `src/infrastructure/db/repositories/index.ts` export; `src/infrastructure/di/types.ts` symbols (`RecordRepository` → `GameRepository`, all Record use case symbols → Game); `src/infrastructure/di/inversify.config.ts` imports and bindings.
- [x] 1.4 Rename interface layer: `src/interface/controllers/record/` → `game/`. Update controller file names and all internal `Record`/`_id`/`team_id` references.
- [x] 1.5 Rename API routes: `src/app/api/records/` → `games/`, route param `[recordId]` → `[gameId]` in all nested routes. Update `src/app/api/matches/route.ts` and any other route files referencing Record types.
- [x] 1.6 Rename page routes: `src/app/record/[recordId]/` → `game/[gameId]/`; `src/app/match/[recordId]/` → `match/[gameId]/`. Update page params.
- [x] 1.7 Rename presentation paths and types: `src/components/record/` → `game/`; `src/lib/features/record/` → `game/` (slice name `"record"` → `"game"`, `recordActions` → `gameActions`, `ReduxRecordState` → `ReduxGameState`); `src/hooks/use-data.ts` (`useRecord` → `useGame`, SWR key `/api/records/` → `/api/games/`). Update all `_id` references to `id` in components, hooks, helpers, actions, and Redux slice.
- [x] 1.8 Update all test files across all layers to use new names, paths, and `id` instead of `_id`. Update `src/lib/scoring-moves.ts` import path.
- [x] 1.9 Match namespace clarification — entity and helper renames: Rename `MatchResult` → `GameSummary` in `src/entities/game.ts`. Rename `matchPhaseHelper` → `gamePhaseHelper` in `src/lib/features/game/helpers/queries/match-phase.helper.ts` (rename file to `game-phase.helper.ts`). Rename `processMatchPhase` → `processGamePhase` in `src/lib/features/game/helpers/optimistic/rally.helper.ts`. Update helpers barrel export, game-slice references, and all test files (`match-phase.helper.test.ts` → `game-phase.helper.test.ts`, rally helper tests).
- [x] 1.10 Match namespace clarification — use case, controller, and DI renames: Rename `FindMatchesUseCase` → `FindGameSummariesUseCase`, `IFindMatchesInput/Output` → `IFindGameSummariesInput/Output` in `src/applications/usecases/game/matches.usecase.ts` (rename file to `game-summaries.usecase.ts`). Rename `findMatchesController` → `findGameSummariesController` in `src/interface/controllers/game/match.controller.ts` (rename file to `game-summary.controller.ts`). Update DI symbols in `src/infrastructure/di/types.ts` and `inversify.config.ts`.
- [x] 1.11 Unified game route structure — page routes: Move `src/app/match/[gameId]/page.tsx` (overview) to `src/app/game/[gameId]/page.tsx`. Move `src/app/match/[gameId]/sets/page.tsx` to `src/app/game/[gameId]/sets/page.tsx`. Create `src/app/game/[gameId]/sets/[setIndex]/entry/page.tsx` from current entry page (switch from `searchParams` `?si=N` to route param `[setIndex]`). Merge `src/app/match/[gameId]/layout.tsx` into `src/app/game/layout.tsx` (reconcile different layout styles for overview vs entry). Delete `src/app/match/` directory.
- [x] 1.12 Unified game route structure — components: Absorb `src/components/match/` into `src/components/game/` (banner, stats, sets, header components). Rename `Matches` → `GameHistory` in `src/components/home/matches.tsx` (rename file to `game-history.tsx`). Update all component imports.
- [x] 1.13 API consolidation: Merge `GET /api/matches` handler into `src/app/api/games/route.ts` GET handler with controller dispatch based on query params. Delete `src/app/api/matches/route.ts`. Rename `useMatches` → `useGameSummaries` in `src/hooks/use-data.ts`, update SWR key to `/api/games?ti=...`.
- [x] 1.14 Navigation updates: Update all `router.push` and `Link href` references to use new paths (`/game/[gameId]`, `/game/[gameId]/sets`, `/game/[gameId]/sets/[setIndex]/entry`). Specifically: `src/components/game/new/index.tsx` (create game → overview), `src/components/game/set-options/panel/options.tsx` (new set → entry), `src/components/match/sets/list.tsx` → now in `src/components/game/` (set click → entry), `src/components/match/banner/index.tsx` → now in `src/components/game/` (sets link), `src/components/home/game-history.tsx` (history item → overview). Update all affected test files.
- [x] 1.15 Run `pnpm test && pnpm lint && pnpm typecheck && pnpm build`. Commit: `refactor: clarify match namespace, and unify game route structure` with a detailed commit message presenting the purposes of changes.

### Review Notes (2026-04-06)

- Review-driven naming refinements were applied beyond strict mechanical path/type rename scope:
  - Test fixtures and ids: remove `createRecord`, `record-*` literal ids in fixtures/tests.
  - Component symbols: remove remaining `Record*` names under `src/components/game/`.
  - Landing feature naming: `RecordingFeatures` → `GameFeatures` with related tests/assets.
  - Schema/repository variable naming: `recordSchema`/`RecordModel` family renamed to `gameSchema`/`GameModel`.
  - Player wording: remove `player record` phrasing in error messages, comments, and test descriptions; simplify to `player`/`player entry`/`player membership` by context.
  - Player reason code rename: `CANNOT_LEAVE_OWN_RECORD` → `NOT_PLAYER_OWNER`.
  - Entry flow semantics refinement: `recording` state/actions/types renamed to `entryDraft`/`setEntryDraft*`/`ReduxEntryDraft`, and entry flow components use local `draft` alias for shorter JSX lines.
- Verification for this review set is complete (`pnpm lint`, `pnpm typecheck`, `pnpm test` all pass). Commit step remains intentionally deferred for manual review.

## 2. Repository interface refactor: domain-language methods and entity mappers

Eliminate MongoDB query semantics from application layer. Implements the entity `_id` to `id` via explicit repository mapper functions decision, the delete `IBaseRepository`, all repos use domain-language interfaces decision, and the infrastructure error translation: wrap all custom repository methods decision.

- [x] 2.1 Delete `src/applications/repositories/base.repository.interface.ts`. Rewrite `IGameRepository` with domain-language methods: `findById(id)`, `findByTeamId(teamId)`, `create(...)`, `update(id, data)`, `delete(id)`, `findGameSummaries(teamId, options)` — no `Record<string, unknown>` or MongoDB-specific filter types. Rewrite `ITeamRepository`, `IProfileRepository`, `IUserRepository` with the same pattern. Update `IPlayerRepository.create` param to `Omit<Player, 'id' | ...>`.
- [x] 2.2 Update `GameRepositoryImpl`: implement new `IGameRepository` methods. Add explicit `toGame()` mapper converting `GameDocument` → `Game` (per the Mongoose Document interfaces are the persistence type decision — no separate persistence DTO). Remove all `as unknown as T` casts. Refactor `findMatchesWithPagination` → `findGameSummaries` to accept typed params instead of raw MongoDB filter object.
- [x] 2.3 Update `PlayerRepositoryImpl.toPlayer()`: output field `_id` → `id`. Update `TeamRepositoryImpl`, `ProfileRepositoryImpl`, `UserRepositoryImpl`: add explicit `toEntity()` mappers, implement domain-language methods, remove `BaseMongoRepository` generic CRUD dependency where methods are now fully custom.
- [x] 2.4 Wrap all custom repository methods with `translateRepositoryError()` per the infrastructure error translation decision (only AppError subclasses shall be thrown requirement, custom repository method translates errors scenario): `PlayerRepositoryImpl` all methods, `GameRepositoryImpl.findGameSummaries`, `TeamRepositoryImpl.removePlayerFromLineups`, `ProfileRepositoryImpl.findByUserId`/`updateActiveTeamId`.
- [x] 2.5 Update all use cases that call repository methods to use new domain-language method signatures (e.g., `findById(id)` instead of `findOne({ _id: id })`). Remove dead defensive code: impossible `if (!result)` guards after repository calls with non-null return types.
- [x] 2.6 Update affected tests (repository tests, use case tests that mock repository calls). Run `pnpm test && pnpm lint && pnpm typecheck && pnpm build`. Commit: `refactor(infrastructure): replace generic repository interfaces with domain-language methods` with a detailed commit message presenting the purposes of the task section and the scope of changes.

### Review Notes (2026-04-07)

- Review-driven improvements applied after `/simplify` audit:
  - Unified `update()` contract across all repositories: `update()` now throws `NotFoundError` instead of returning `null` when the target entity is not found. Return type changed from `Promise<T | null>` to `Promise<T>` in `IGameRepository`, `ITeamRepository`, and `IProfileRepository` (player repo already followed this pattern). Removed dead `?? undefined` guards in `set.usecase.ts`.
  - Removed unused `IGameRepository.findByTeamId` method (no use case caller existed).
  - Added `{ $set: data }` wrapper in `GameRepositoryImpl.update()` to use field-level MongoDB updates instead of full document replacement. This is a minimal efficiency improvement; further options documented below.
  - Extracted duplicated `mockExec`/`mockDoc` test helpers to shared `src/__tests__/helpers/mock-mongoose.ts`, replacing the outdated `createMockDocument`/`setupModelMocks`.
  - Replaced string literals `"OWNER"`, `"ADMIN"` with `PlayerRole` enum in `player.repository.mongo.ts`.
- `GameRepositoryImpl.update()` efficiency improvement options for future consideration:
  - **Field-level `$set` wrapping** (applied): wrap `findByIdAndUpdate` data with `{ $set: data }` so MongoDB performs field-level updates rather than full document replacement. Minimal change, modest improvement.
  - **Use case passes partial data**: change use case callers to pass only modified fields (e.g., `{ sets: updatedSets }`) instead of the entire game object. Requires use case refactoring but avoids transmitting unchanged fields.
  - **Dedicated array-operation repository methods**: add methods like `pushRallyToSet(gameId, setIndex, rally)` using MongoDB `$push`/positional operators for element-level array writes. Best efficiency for high-frequency operations (rally entry), but increases interface surface area.

## 3. Use case restructure: 1-file-per-class, merge interfaces

Implements the use case file structure: 1-file-per-class with co-located interface decision.

- [ ] 3.1 Split game domain multi-class use case files to 1-file-per-class: `record.usecase.ts` → `find-game.usecase.ts` + `create-game.usecase.ts`; `rally.usecase.ts` → `create-rally.usecase.ts` + `update-rally.usecase.ts`; `set.usecase.ts` → `create-set.usecase.ts` + `update-set.usecase.ts`; `substitution.usecase.ts` → `create-substitution.usecase.ts`; `game-summaries.usecase.ts` → `find-game-summaries.usecase.ts`. Each file co-locates its interface and class.
- [ ] 3.2 Merge all standalone `.usecase.interface.ts` files in `player/` and `team/` domains into their corresponding `.usecase.ts` (interface above class, both exported). Delete `.usecase.interface.ts` files. Update barrel `index.ts` in each domain.
- [ ] 3.3 Update DI container (`inversify.config.ts`, `types.ts`) to register all 8 split game use cases with correct imports.
- [ ] 3.4 Split `record-errors.test.ts` into per-use-case test files under `game/__tests__/`. Update test imports.
- [ ] 3.5 Run `pnpm test && pnpm lint && pnpm typecheck && pnpm build`. Commit: `refactor(applications): unify use case file structure to one class per file` with a detailed commit message presenting the purposes of the task section and the scope of changes.

## 4. Presentation type decoupling: Zod response schemas and view types

Decouple presentation layer from domain entities per the presentation types via Zod response schemas decision. Components stop importing entity data shapes.

- [ ] 4.1 Create game domain Zod response schemas in `src/lib/features/game/types.ts`: `GameResponseSchema`, `GameTeamResponseSchema`, `SetResponseSchema`, `GameSummaryResponseSchema`. Derive view types: `GameView`, `GameTeamView`, `SetView`, `GameSummaryView` via `z.infer`. All use `id: string`. Migrate existing `MatchInfoFormSchema`, form types, and Redux types in the same file to use `id`.
- [ ] 4.2 Create player/team domain Zod response schemas in `src/lib/features/team/types.ts`: `PlayerResponseSchema` → `PlayerView`, `TeamResponseSchema` → `TeamView`, `LineupResponseSchema` → `LineupView`. All use `id: string`.
- [ ] 4.3 Update `src/components/game/` (26 files): replace `@/entities/game` data shape imports with `GameView`, `SetView`, etc. from `@/lib/features/game/types`. Keep enum imports (`MoveType`, `EntryType`, `Side`) from `@/entities/game`.
- [ ] 4.4 Update game overview/stats/sets components (now in `src/components/game/`, absorbed from former `src/components/match/`): replace entity imports with `SetView`, `GameTeamView`, `GameSummaryView` from feature types. Keep enum imports from `@/entities/game`.
- [ ] 4.5 Update `src/components/team/` (10 files): replace `@/entities/player` and `@/entities/team` data shape imports with `PlayerView`, `TeamView`, `LineupView` from `@/lib/features/team/types`. Keep enum imports (`PlayerRole`, `PlayerStatus`, `Position`) from entities.
- [ ] 4.6 Update `src/components/home/game-history.tsx`, `src/components/user/` (invitations, menu), `src/components/landing/features/analytics.tsx`: replace entity data shape imports with view types; keep enum-only imports from entities.
- [ ] 4.7 Update `src/lib/features/game/` helpers, actions, hooks: use `GameView` where appropriate for presentation-layer logic. Update `src/lib/features/team/lineup-slice.ts` to use `LineupView`.
- [ ] 4.8 Update `src/hooks/use-data.ts`: change return types to view types (`GameView`, `GameSummaryView`).
- [ ] 4.9 Update all component and feature test files to use view types. Eliminate any remaining type assertions (`as` casts) at layer boundaries.
- [ ] 4.10 Verify no remaining `@/entities/*` data shape imports in `src/components/` or `src/lib/features/` (enum imports are allowed). Run `pnpm test && pnpm lint && pnpm typecheck && pnpm build`. Commit: `refactor(presentation): decouple presentation layer from domain entity types` with a detailed commit message presenting the purposes of the task section and the scope of changes.

## 5. Migration script and documentation

- [ ] 5.1 Create MongoDB migration script at `scripts/migrate-rename-records-to-games.ts`: `db.records.renameCollection("games")`. Document usage and rollback in script header.
- [ ] 5.2 Add "Type Boundary Drift" section to `docs/maintenance-policy.md`: document the maintenance policy for keeping domain entity types, API response Zod schemas, and presentation view types in sync when domain models change.
- [ ] 5.3 Update `CLAUDE.md` component organization section: `record/` → `game/`, remove `match/` (absorbed into `game/`). Update `openspec/config.yaml` if any references to `record` or `match` remain. Review and update `README.md`, `CONTRIBUTING.md`, `docs/` for record-related and match-related paths or types.
- [ ] 5.4 Run final `pnpm test && pnpm lint && pnpm typecheck && pnpm build`. Commit: `docs: add migration script and update documentation for type-decoupling` with a detailed commit message presenting the purposes of the task section and the scope of changes.
