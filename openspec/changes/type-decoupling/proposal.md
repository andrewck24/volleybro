## Why

The codebase has three categories of type boundary violations that break Clean Architecture's dependency rule:

1. **MongoDB `_id` leaks into every layer** — All entities use `_id: string`, coupling the domain model to MongoDB's naming convention. Every component, hook, use case, and controller references `_id` directly.
2. **Presentation layer imports domain entities directly** — 32 component files and 28 lib files import from `@/entities/`, forcing frontend code to handle domain-level optional/nullable semantics and causing domain model changes to ripple into every component.
3. **Repository interfaces leak MongoDB query semantics** — `IBaseRepository` exposes `filter: Record<string, unknown>` in the application layer, and `IRecordRepository.findMatchesWithPagination` uses MongoDB-specific `$and` / `[key: string]: unknown` filter shapes.

Additionally, the domain entity `Record` conflicts with TypeScript's built-in `Record<K,V>` utility type, requiring `Record as RecordEntity` aliasing across 15+ files.

## What Changes

### Entity layer

- **BREAKING**: Rename `Record` entity to `Game` across the entire codebase (entity, repository interfaces, use cases, controllers, API routes, components, hooks, Redux slice, tests)
- **BREAKING**: Replace `_id: string` with `id: string` in all entity types (`Player`, `Game`, `Team`, `User`, `Profile`, `Staff`, `LineupPlayer`, `MatchResult`, `RallyDetail`)
- Rename `entities/record.ts` to `entities/game.ts`; rename `team_id` to `teamId` in `Game` entity

### Use case layer

- Merge `.usecase.interface.ts` into corresponding `.usecase.ts` files (interface defined above class, both exported); delete all standalone `.usecase.interface.ts` files
- Split multi-class use case files in `record/` (now `game/`) to 1-file-per-class pattern, matching player/team/user domains:
  - `record.usecase.ts` → `find-game.usecase.ts` + `create-game.usecase.ts`
  - `rally.usecase.ts` → `create-rally.usecase.ts` + `update-rally.usecase.ts`
  - `set.usecase.ts` → `create-set.usecase.ts` + `update-set.usecase.ts`
  - `substitution.usecase.ts` → `create-substitution.usecase.ts`
  - `matches.usecase.ts` → `find-matches.usecase.ts`
- Rename `src/applications/usecases/record/` to `src/applications/usecases/game/`
- Split `record-errors.test.ts` into per-use-case test files

### Repository interfaces

- Delete `IBaseRepository` and `base.repository.interface.ts`
- Rewrite `IRecordRepository` as `IGameRepository` with domain-language methods (following `IPlayerRepository` pattern)
- Rewrite `ITeamRepository`, `IProfileRepository`, `IUserRepository` with domain-language methods; no `Record<string, unknown>` filters

### Infrastructure layer

- Add `_id` ↔ `id` mapping in all Mongoose repository implementations
- Implement new domain-language methods matching refactored interfaces
- Ensure all custom repository methods wrap errors with `translateRepositoryError()`

### Presentation type layer

- Introduce API response Zod schemas in `src/lib/features/*/types.ts` as the single source of truth for frontend types
- Derive `*View` types via `z.infer` (e.g., `GameView`, `PlayerView`, `TeamView`)
- Components import only from `@/lib/features/*/types` for data shapes; direct `@/entities/*` imports restricted to enums (`MoveType`, `EntryType`, `Side`, `Position`, `PlayerRole`, `PlayerStatus`)
- Eliminate type assertions at layer boundaries

### URL and path rename

- **BREAKING**: Rename page route `src/app/record/[recordId]/` to `src/app/game/[gameId]/`
- **BREAKING**: Rename page route param `src/app/match/[recordId]/` to `src/app/match/[gameId]/`
- **BREAKING**: Rename API routes `src/app/api/records/` to `src/app/api/games/`
- Rename component directory `src/components/record/` to `src/components/game/`
- Rename Redux feature `src/lib/features/record/` to `src/lib/features/game/`
- Rename hooks: `use-data.ts` references updated, record-specific hooks renamed
- Update all SWR keys and API fetch URLs

### Dead code cleanup

- Remove impossible `if (!result)` guards after repository calls with non-null return types
- Remove `Record as RecordEntity` aliasing workarounds

## Non-Goals

- Use case test coverage expansion (separate change: `refactor-record-usecases`)
- API integration tests (separate change: `api-integration-tests`)
- Monorepo structural migration (separate change: `monorepo-split`)
- i18n setup (separate change)
- Changing database schema or MongoDB document structure (Mongoose schemas handle `_id`/`id` mapping)
- Changing authentication or authorization logic

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `error-handling`: Infrastructure error translation coverage extends to all custom repository methods that currently bypass `translateRepositoryError()`

## Impact

- **Entities**: `src/entities/record.ts` (renamed to `game.ts`), `player.ts`, `team.ts`, `user.ts`, `profile.ts`
- **Repository interfaces**: All 6 files in `src/applications/repositories/` (`base` deleted, others rewritten)
- **Use cases**: All files in `src/applications/usecases/record/` (renamed to `game/`, multi-class files split to 1-file-per-class); all `.usecase.interface.ts` merged into `.usecase.ts` across player/team/user domains; `record-errors.test.ts` split into per-use-case test files
- **Infrastructure repos**: All 6 files in `src/infrastructure/db/repositories/`
- **Controllers**: `src/interface/controllers/record/` (renamed to `game/`)
- **API routes**: `src/app/api/records/` (renamed to `games/`), plus `matches/`, `teams/`, `players/`, `profiles/`
- **Pages**: `src/app/record/` (renamed to `game/`), `src/app/match/`
- **Components**: `src/components/record/` (renamed to `game/`, 26 files), `match/` (12 files), `team/` (10 files), `home/`, `user/`
- **Lib features**: `src/lib/features/record/` (renamed to `game/`, 20 files), `team/`
- **Hooks**: `src/hooks/use-data.ts`
- **DI container**: `src/infrastructure/di/`
- **Tests**: All test files in affected directories
- **Estimated total**: ~130 files
