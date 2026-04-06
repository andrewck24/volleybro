## Context

The codebase follows Clean Architecture with five layers (Domain, Application, Infrastructure, Interface, Presentation). However, type boundaries between layers are not enforced:

- All 6 entity types use MongoDB's `_id` field name, leaking infrastructure concerns into domain and presentation layers
- 60+ frontend files import directly from `@/entities/`, creating tight coupling between presentation and domain layers
- `IBaseRepository` exposes `Record<string, unknown>` filters, allowing MongoDB query semantics to leak into the application layer
- The `Record` entity name conflicts with TypeScript's built-in `Record<K,V>`, causing aliasing across 15+ files
- Use case files in the `record` domain bundle multiple classes per file, diverging from the 1-file-per-class pattern used in player/team/user domains

## Goals / Non-Goals

**Goals:**

- Enforce Clean Architecture dependency rule at the type level: presentation layer never imports entity data shapes, repository interfaces use domain-language methods only
- Rename `Record` to `Game` throughout the entire codebase including URL paths, Mongoose model/collection, DI symbols, error reasons, components, hooks, and features
- Replace `_id` with `id` in all entity types; infrastructure layer handles mapping via explicit mapper functions
- Unify use case file structure to 1-file-per-class with co-located interface across all domains
- Extend error translation coverage to all repository methods

**Non-Goals:**

- Changing MongoDB document schema (Mongoose Document interfaces remain the persistence type; no additional persistence DTO layer)
- Expanding use case test coverage beyond what's affected by the refactor
- i18n, monorepo migration, or API integration tests
- Changing auth/authorization logic

## Decisions

### Entity `_id` to `id` via explicit repository mapper functions

All entity types replace `_id: string` with `id: string`. Each Mongoose repository implements an explicit `toEntity()` mapper function (following the existing `PlayerRepositoryImpl.toPlayer()` pattern) instead of relying on Mongoose toJSON transforms or `as unknown as T` casts.

```typescript
// game.repository.mongo.ts
private toGame(doc: GameDocument): Game {
  const obj = doc.toObject();
  return {
    id: obj._id.toString(),
    teamId: obj.team_id.toString(),
    win: obj.win,
    info: obj.info,
    teams: { ... },
    sets: [ ... ],
  };
}
```

This approach:

- Gives TypeScript full visibility into each field mapping (no unsafe casts)
- Makes the `_id` → `id` and `ObjectId` → `string` conversions explicit and traceable
- Is already the established pattern in `PlayerRepositoryImpl.toPlayer()`

Alternative considered: Mongoose `toJSON` transform configured per-schema. Rejected because it still requires `as unknown as T` at the repository return boundary, hiding type mismatches.

### Mongoose Document interfaces are the persistence type

No additional persistence DTO layer is needed. The existing Mongoose Document interfaces (`PlayerDocument`, `RecordDocument` → `GameDocument`, etc.) in `src/infrastructure/db/mongoose/schemas/` already describe the MongoDB document structure with `Types.ObjectId`, embedded subdocuments, etc. Adding a separate persistence type (e.g., `PlayerPersistence`) would duplicate this with no new information.

The type flow is:

```text
Mongoose Document interface    →  repository mapper  →  Domain Entity
(infrastructure/db/mongoose/)     (toGame(), etc.)       (entities/)
Types.ObjectId, _id, team_id      explicit conversion    string id, teamId
```

### `Record` renamed to `Game` with full path migration

Complete rename mapping:

| Current                                                     | New                                                       |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| `entities/record.ts`                                        | `entities/game.ts`                                        |
| `entities/errors/reasons/record.ts`                         | `entities/errors/reasons/game.ts`                         |
| `applications/usecases/record/`                             | `applications/usecases/game/`                             |
| `applications/repositories/record.repository.interface.ts`  | `applications/repositories/game.repository.interface.ts`  |
| `infrastructure/db/repositories/record.repository.mongo.ts` | `infrastructure/db/repositories/game.repository.mongo.ts` |
| `infrastructure/db/mongoose/schemas/record.ts`              | `infrastructure/db/mongoose/schemas/game.ts`              |
| `infrastructure/di/types.ts` symbols                        | `GameRepository`, `FindGameUseCase`, etc.                 |
| `infrastructure/di/inversify.config.ts`                     | All Record bindings → Game                                |
| `interface/controllers/record/`                             | `interface/controllers/game/`                             |
| `app/api/records/[recordId]/`                               | `app/api/games/[gameId]/`                                 |
| `app/record/[recordId]/`                                    | `app/game/[gameId]/`                                      |
| `app/match/[recordId]/`                                     | `app/match/[gameId]/`                                     |
| `components/record/`                                        | `components/game/`                                        |
| `lib/features/record/`                                      | `lib/features/game/`                                      |
| `hooks/use-data.ts` `useRecord()`                           | `useGame()`, SWR key `/api/games/`                        |
| `RecordReason` enum                                         | `GameReason`                                              |

The `entities/game.ts` file also renames `team_id` to `teamId` to align with the camelCase convention used in `Player.teamId`. The Mongoose schema retains `team_id` as the MongoDB field name; the mapper handles the conversion.

The Mongoose model name changes from `"Record"` to `"Game"` and the collection name from `"records"` to `"games"`. This requires a MongoDB collection rename migration (`db.records.renameCollection("games")`). The risk is acceptable given the application is pre-launch with limited data. A migration script is included in the tasks. The schema file renames to `game.ts`, model registration becomes `model<GameDocument>("Game", gameSchema, "games")`.

### Delete `IBaseRepository`, all repos use domain-language interfaces

`IBaseRepository<T>` with `filter: Record<string, unknown>` is deleted. Each repository interface defines its own domain-specific methods following the existing `IPlayerRepository` pattern:

```typescript
// Before (leaks MongoDB semantics)
export interface ITeamRepository extends IBaseRepository<Team> {
  removePlayerFromLineups(teamId: string, playerId: string): Promise<void>;
}

// After (domain language only)
export interface ITeamRepository {
  findById(id: string): Promise<Team | null>;
  create(data: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<Team>;
  update(id: string, updates: Partial<Team>): Promise<Team | null>;
  delete(id: string): Promise<boolean>;
  removePlayerFromLineups(teamId: string, playerId: string): Promise<void>;
}
```

`BaseMongoRepository` class in infrastructure is retained as a utility (provides `translateRepositoryError`), but it no longer implements a shared application-layer interface. Repositories that only need `translateRepositoryError` can import it as a standalone function.

### Presentation types via Zod response schemas

Frontend types are derived from Zod schemas that describe the API response shape, not from domain entities:

```text
Domain (entities/)              → id: string, pure business types
Application (usecases/)         → uses domain types directly
Interface (controllers/)        → serializes domain types to API response
Presentation (lib/features/)    → Zod schema defines response shape
                                  → z.infer<typeof Schema> = *View type
Components (components/)        → imports *View types only
```

Type naming convention:

| Layer               | Naming            | Source       | Example                  |
| ------------------- | ----------------- | ------------ | ------------------------ |
| Domain entity       | Plain noun        | Hand-written | `Game`, `Player`, `Team` |
| API response schema | `*ResponseSchema` | Zod          | `GameResponseSchema`     |
| View type           | `*View`           | `z.infer`    | `GameView`, `PlayerView` |
| Form values         | `*FormValues`     | `z.infer`    | `MatchInfoFormValues`    |
| Redux state         | `Redux*State`     | Hand-written | `ReduxGameState`         |
| Component props     | `*Props`          | Hand-written | `RallyEntryProps`        |

Domain enums (`MoveType`, `EntryType`, `Side`, `Position`, `PlayerRole`, `PlayerStatus`) remain importable from `@/entities/*` in all layers. Enums are values (not data shapes), so they do not create coupling.

### Use case file structure: 1-file-per-class with co-located interface

All domains use the same pattern: one `.usecase.ts` file contains the interface and its implementing class.

```typescript
// find-game.usecase.ts
export interface IFindGameUseCase {
  execute(input: IFindGameInput): Promise<Game>;
}

@injectable()
export class FindGameUseCase implements IFindGameUseCase { ... }
```

The `game` domain's multi-class files are split:

| Current file              | Split into                                            |
| ------------------------- | ----------------------------------------------------- |
| `record.usecase.ts`       | `find-game.usecase.ts` + `create-game.usecase.ts`     |
| `rally.usecase.ts`        | `create-rally.usecase.ts` + `update-rally.usecase.ts` |
| `set.usecase.ts`          | `create-set.usecase.ts` + `update-set.usecase.ts`     |
| `substitution.usecase.ts` | `create-substitution.usecase.ts`                      |
| `matches.usecase.ts`      | `find-matches.usecase.ts`                             |

All standalone `.usecase.interface.ts` files in player/team domains are merged into their `.usecase.ts` counterpart and deleted. Barrel `index.ts` files are updated accordingly.

### Infrastructure error translation: wrap all custom repository methods

All Mongoose repository methods that currently bypass `translateRepositoryError()` are wrapped in try-catch blocks. The `translateRepositoryError` function is imported directly from `base.repository.mongo.ts` (which becomes a utility module rather than a base class dependency).

## Risks / Trade-offs

- **Large blast radius (~130 files)** → Mitigated by executing in layer order (entities first, then application, infrastructure, interface, presentation) with tests passing at each stage. Each section is committed independently.
- **URL path breaking change (`/record/` → `/game/`, `/api/records/` → `/api/games/`)** → Pre-launch application; no public API consumers. SWR cache keys and PWA deep links will break and need updating. Serwist precache manifest regenerates on build.
- **Mongoose model name kept as `"Record"` with collection `"records"`** → Avoids database migration. The TypeScript-side rename is purely a code concern. If the collection name becomes confusing later, a MongoDB rename can be done independently.
- **Presentation Zod schemas duplicate domain type structure** → Intentional. The duplication is the decoupling. Changes to domain types that don't affect the API response require no frontend changes.
- **`toEntity()` mapper maintenance** → Each repository must keep its mapper in sync with entity changes. Mitigated by TypeScript strict mode catching any field mismatches at compile time.

## Implementation Notes (2026-04-06)

- During implementation review, several naming drifts were corrected to preserve language consistency after `Record`→`Game` migration:
  - Residual `Record*` and `*Record*` symbols in tests/components were removed.
  - Landing page feature naming was normalized from `RecordingFeatures` to `GameFeatures`.
  - Mongoose schema/repository local symbols were normalized (`recordSchema`/`RecordModel` → `gameSchema`/`GameModel`) to match file/domain names.
  - Player-layer user-facing wording and test descriptions replaced `player record` with context-specific terms (`player`, `player entry`, `player membership`), and reason code names were aligned.
  - Entry flow state naming was refined from `recording` to `entryDraft` to reflect draft semantics before entry confirmation.
- These adjustments are consistent with the proposal intent (terminology decoupling and domain-language alignment), while extending beyond the initially explicit mechanical rename checklist items.
