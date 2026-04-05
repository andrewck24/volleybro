## 1. Mechanical rename: `Record` → `Game`, `_id` → `id`, file/directory/URL paths

All layers touched simultaneously via find-replace. No logic changes. Implements the `Record` renamed to `Game` with full path migration decision.

- [ ] 1.1 Rename entity file `src/entities/record.ts` → `game.ts`. Rename type `Record` → `Game`, all `_id: string` → `id: string` in every entity type (`Game`, `Player`, `Staff`, `Team`, `MatchResult`, `RallyDetail`, `LineupPlayer`), `team_id` → `teamId` in `Game`. Update `src/entities/player.ts`, `team.ts`, `user.ts`, `profile.ts` with `id` instead of `_id`. Rename `src/entities/errors/reasons/record.ts` → `game.ts`, `RecordReason` → `GameReason` (domain-scoped reason enums requirement).
- [ ] 1.2 Rename application layer paths and types: `src/applications/repositories/record.repository.interface.ts` → `game.repository.interface.ts` (rename `IRecordRepository` → `IGameRepository`); `src/applications/usecases/record/` → `game/`. Update all `Record`/`_id`/`team_id`/`RecordReason` references in use case and repository interface files.
- [ ] 1.3 Rename infrastructure paths and types: `src/infrastructure/db/mongoose/schemas/record.ts` → `game.ts` (`RecordDocument` → `GameDocument`, model name `"Record"` → `"Game"`, collection `"records"` → `"games"`); `src/infrastructure/db/repositories/record.repository.mongo.ts` → `game.repository.mongo.ts` (`RecordRepositoryImpl` → `GameRepositoryImpl`); `src/infrastructure/db/repositories/index.ts` export; `src/infrastructure/di/types.ts` symbols (`RecordRepository` → `GameRepository`, all Record use case symbols → Game); `src/infrastructure/di/inversify.config.ts` imports and bindings.
- [ ] 1.4 Rename interface layer: `src/interface/controllers/record/` → `game/`. Update controller file names and all internal `Record`/`_id`/`team_id` references.
- [ ] 1.5 Rename API routes: `src/app/api/records/` → `games/`, route param `[recordId]` → `[gameId]` in all nested routes. Update `src/app/api/matches/route.ts` and any other route files referencing Record types.
- [ ] 1.6 Rename page routes: `src/app/record/[recordId]/` → `game/[gameId]/`; `src/app/match/[recordId]/` → `match/[gameId]/`. Update page params.
- [ ] 1.7 Rename presentation paths and types: `src/components/record/` → `game/`; `src/lib/features/record/` → `game/` (slice name `"record"` → `"game"`, `recordActions` → `gameActions`, `ReduxRecordState` → `ReduxGameState`); `src/hooks/use-data.ts` (`useRecord` → `useGame`, SWR key `/api/records/` → `/api/games/`). Update all `_id` references to `id` in components, hooks, helpers, actions, and Redux slice.
- [ ] 1.8 Update all test files across all layers to use new names, paths, and `id` instead of `_id`. Update `src/lib/scoring-moves.ts` import path.
- [ ] 1.9 Run `pnpm test && pnpm lint && pnpm typecheck && pnpm build`. Commit: `refactor: rename Record to Game and replace _id with id across all layers` with a detailed commit message presenting the purposes of the task section and the scope of changes.

## 2. Repository interface refactor: domain-language methods and entity mappers

Eliminate MongoDB query semantics from application layer. Implements the entity `_id` to `id` via explicit repository mapper functions decision, the delete `IBaseRepository`, all repos use domain-language interfaces decision, and the infrastructure error translation: wrap all custom repository methods decision.

- [ ] 2.1 Delete `src/applications/repositories/base.repository.interface.ts`. Rewrite `IGameRepository` with domain-language methods: `findById(id)`, `findByTeamId(teamId)`, `create(...)`, `update(id, data)`, `delete(id)`, `findMatchesWithPagination(teamId, options)` — no `Record<string, unknown>` or MongoDB-specific filter types. Rewrite `ITeamRepository`, `IProfileRepository`, `IUserRepository` with the same pattern. Update `IPlayerRepository.create` param to `Omit<Player, 'id' | ...>`.
- [ ] 2.2 Update `GameRepositoryImpl`: implement new `IGameRepository` methods. Add explicit `toGame()` mapper converting `GameDocument` → `Game` (per the Mongoose Document interfaces are the persistence type decision — no separate persistence DTO). Remove all `as unknown as T` casts. Refactor `findMatchesWithPagination` to accept typed params instead of raw MongoDB filter object.
- [ ] 2.3 Update `PlayerRepositoryImpl.toPlayer()`: output field `_id` → `id`. Update `TeamRepositoryImpl`, `ProfileRepositoryImpl`, `UserRepositoryImpl`: add explicit `toEntity()` mappers, implement domain-language methods, remove `BaseMongoRepository` generic CRUD dependency where methods are now fully custom.
- [ ] 2.4 Wrap all custom repository methods with `translateRepositoryError()` per the infrastructure error translation decision (only AppError subclasses shall be thrown requirement, custom repository method translates errors scenario): `PlayerRepositoryImpl` all methods, `GameRepositoryImpl.findMatchesWithPagination`, `TeamRepositoryImpl.removePlayerFromLineups`, `ProfileRepositoryImpl.findByUserId`/`updateActiveTeamId`.
- [ ] 2.5 Update all use cases that call repository methods to use new domain-language method signatures (e.g., `findById(id)` instead of `findOne({ _id: id })`). Remove dead defensive code: impossible `if (!result)` guards after repository calls with non-null return types.
- [ ] 2.6 Update affected tests (repository tests, use case tests that mock repository calls). Run `pnpm test && pnpm lint && pnpm typecheck && pnpm build`. Commit: `refactor(infrastructure): replace generic repository interfaces with domain-language methods` with a detailed commit message presenting the purposes of the task section and the scope of changes.

## 3. Use case restructure: 1-file-per-class, merge interfaces

Implements the use case file structure: 1-file-per-class with co-located interface decision.

- [ ] 3.1 Split game domain multi-class use case files to 1-file-per-class: `record.usecase.ts` → `find-game.usecase.ts` + `create-game.usecase.ts`; `rally.usecase.ts` → `create-rally.usecase.ts` + `update-rally.usecase.ts`; `set.usecase.ts` → `create-set.usecase.ts` + `update-set.usecase.ts`; `substitution.usecase.ts` → `create-substitution.usecase.ts`; `matches.usecase.ts` → `find-matches.usecase.ts`. Each file co-locates its interface and class.
- [ ] 3.2 Merge all standalone `.usecase.interface.ts` files in `player/` and `team/` domains into their corresponding `.usecase.ts` (interface above class, both exported). Delete `.usecase.interface.ts` files. Update barrel `index.ts` in each domain.
- [ ] 3.3 Update DI container (`inversify.config.ts`, `types.ts`) to register all 8 split game use cases with correct imports.
- [ ] 3.4 Split `record-errors.test.ts` into per-use-case test files under `game/__tests__/`. Update test imports.
- [ ] 3.5 Run `pnpm test && pnpm lint && pnpm typecheck && pnpm build`. Commit: `refactor(applications): unify use case file structure to one class per file` with a detailed commit message presenting the purposes of the task section and the scope of changes.

## 4. Presentation type decoupling: Zod response schemas and view types

Decouple presentation layer from domain entities per the presentation types via Zod response schemas decision. Components stop importing entity data shapes.

- [ ] 4.1 Create game domain Zod response schemas in `src/lib/features/game/types.ts`: `GameResponseSchema`, `GameTeamResponseSchema`, `SetResponseSchema`, `MatchResultResponseSchema`. Derive view types: `GameView`, `GameTeamView`, `SetView`, `MatchResultView` via `z.infer`. All use `id: string`. Migrate existing `MatchInfoFormSchema`, form types, and Redux types in the same file to use `id`.
- [ ] 4.2 Create player/team domain Zod response schemas in `src/lib/features/team/types.ts`: `PlayerResponseSchema` → `PlayerView`, `TeamResponseSchema` → `TeamView`, `LineupResponseSchema` → `LineupView`. All use `id: string`.
- [ ] 4.3 Update `src/components/game/` (26 files): replace `@/entities/game` data shape imports with `GameView`, `SetView`, etc. from `@/lib/features/game/types`. Keep enum imports (`MoveType`, `EntryType`, `Side`) from `@/entities/game`.
- [ ] 4.4 Update `src/components/match/` (12 files): replace entity imports with `SetView`, `GameTeamView`, `MatchResultView` from feature types. Keep enum imports from `@/entities/game`.
- [ ] 4.5 Update `src/components/team/` (10 files): replace `@/entities/player` and `@/entities/team` data shape imports with `PlayerView`, `TeamView`, `LineupView` from `@/lib/features/team/types`. Keep enum imports (`PlayerRole`, `PlayerStatus`, `Position`) from entities.
- [ ] 4.6 Update `src/components/home/matches.tsx`, `src/components/user/` (invitations, menu), `src/components/landing/features/analytics.tsx`: replace entity data shape imports with view types; keep enum-only imports from entities.
- [ ] 4.7 Update `src/lib/features/game/` helpers, actions, hooks: use `GameView` where appropriate for presentation-layer logic. Update `src/lib/features/team/lineup-slice.ts` to use `LineupView`.
- [ ] 4.8 Update `src/hooks/use-data.ts`: change return types to view types (`GameView`, `MatchResultView`).
- [ ] 4.9 Update all component and feature test files to use view types. Eliminate any remaining type assertions (`as` casts) at layer boundaries.
- [ ] 4.10 Verify no remaining `@/entities/*` data shape imports in `src/components/` or `src/lib/features/` (enum imports are allowed). Run `pnpm test && pnpm lint && pnpm typecheck && pnpm build`. Commit: `refactor(presentation): decouple presentation layer from domain entity types` with a detailed commit message presenting the purposes of the task section and the scope of changes.

## 5. Migration script and documentation

- [ ] 5.1 Create MongoDB migration script at `scripts/migrate-rename-records-to-games.ts`: `db.records.renameCollection("games")`. Document usage and rollback in script header.
- [ ] 5.2 Add "Type Boundary Drift" section to `docs/maintenance-policy.md`: document the maintenance policy for keeping domain entity types, API response Zod schemas, and presentation view types in sync when domain models change.
- [ ] 5.3 Update `CLAUDE.md` component organization section: `record/` → `game/`. Update `openspec/config.yaml` if any references to `record` remain. Review and update `README.md`, `CONTRIBUTING.md`, `docs/` for record-related paths or types.
- [ ] 5.4 Run final `pnpm test && pnpm lint && pnpm typecheck && pnpm build`. Commit: `docs: add migration script and update documentation for type-decoupling` with a detailed commit message presenting the purposes of the task section and the scope of changes.
