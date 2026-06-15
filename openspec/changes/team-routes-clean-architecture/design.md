## Context

Empirically verified against mongoose 9.4.1 (probe scripts, not assumptions):

- The lineup player subschemas already set `{ _id: false }` and declare the player reference on an explicit `_id` ObjectId path. An empty slot submitted as `{ id: null }` therefore persists as `null` (the whole element), NOT an auto-generated orphan ObjectId.
- `id` is a read-only Mongoose virtual (getter for `_id.toHexString()`) with no setter. Constructing a subdocument from a client `{ id: "hex", ... }` drops the `id` value entirely (`{ name, number }` with no `_id`). So every client/domain write (lineups PATCH, create-game roster, game updates) silently loses the embedded player reference.
- The single-game read path (`GET /api/games/[gameId]` → `findGameController` → `FindGameUseCase` → `gameRepository.findById` → `toGame`) only maps the top-level `_id → id`; nested player references stay as `_id`. There is no `toObject({ virtuals: true })` and no Zod re-parse on read.

`lineupSchema` is shared: `game.ts` imports it for `sets[].lineups.home/away` and `teams.{side}.lineup`. The codebase reference convention is ObjectId everywhere (`Player.teamId`, `Player.userId`, all `_id`) with indexes; no `$lookup`/`populate` is currently used. The team create flow already uses route → controller → use case → repository (`createTeamController` → `CreateTeamUseCase`).

## Goals / Non-Goals

**Goals:**

- Make embedded player references persist on write and read back as stable string `id`s, for both team lineups and game documents.
- Represent an empty lineup slot honestly as `playerId: null` (an object slot, never a bare `null` element).
- Route the three team endpoints through Clean Architecture layers.
- Migrate existing data once, audit-first, without assuming orphan ids or recoverable references exist.

**Non-Goals:**

- No `apiClient` Zod validation, no domain/wire shape change, no string-typed reference, no temporary-player implementation, no redo of the shipped surgical frontend fixes.

## Decisions

### Rename embedded player reference from _id to nullable playerId in the shared schema

Replace the `_id: { type: ObjectId, ref: "Player" }` player reference with `playerId: { type: ObjectId, ref: "Player", default: null }` (keeping `{ _id: false }`) on the lineup subschemas (starting/liberos/substitutes and the `sub` subschema), and on the game `playerSchema`, `staffSchema`, and `rallyDetailSchema.player` (adding `{ _id: false }` there). Rationale: `_id` is a primary-key path being misused as a foreign key, which forces the read-only `id` virtual collision and prevents a null/absent reference. A normal nullable `playerId` FK can be written, read, and left null. Alternatives rejected: (a) a `toJSON` transform — forks a second mapping path, fragile for nested subdocs; (b) a string-typed `id` field — avoids conversion but diverges from the ObjectId reference convention and loses type validation/joins; (c) keeping `_id` — cannot express an empty reference and keeps the virtual write-drop.

### Bidirectional player-reference mapping in the repository layer

The repository is the single translation boundary between the domain shape (`id: string | null`) and the persisted shape (`playerId: ObjectId | null`). Read mappers convert `playerId → id` (`null → null`); a new write mapper converts `id → playerId`. Domain entities, Zod schemas, Redux, and React keep using `id` only. Rationale: the codebase already performs ObjectId↔string conversion at every repository boundary (`toTeam`, player repo, game top-level), so this follows the established pattern and centralizes correctness.

### Persist lineups via findByIdAndUpdate returning the mapped result

Add `ITeamRepository.updateLineups(teamId, lineups)`: map each lineup through the write mapper, `findByIdAndUpdate(teamId, { lineups }, { new: true })`, throw `NotFoundError` when absent, and return `toTeam(doc).lineups`. The write mapper emits an object per slot (`{ playerId: null, position }` for empty), eliminating the bare-`null` element that crashes the court's `starting.map`. Update `removePlayerFromLineups` to `$pull` by `playerId` instead of `_id`. Rationale: mirrors the existing `update` shape so the mocked repository test harness extends naturally.

### Centralize game read and write mapping in the game repository

Extend `toGame` to map every embedded player reference (set lineups, team player/staff snapshots, rally detail, and substitution entry `players.in/out`) to domain `id` on read, and add a `toGameDoc` write mapper applied in `create`/`update` that maps domain `id → playerId` (Mongoose auto-casts the hex string to ObjectId for ObjectId paths). Game use cases (create-game, create-set, create-substitution, update-rally) and frontend consumers (use-lineup, substitution.helper) are unchanged because the translation lives entirely in the repository. Rationale: keeps the mapping in one place and avoids touching the live game-recording flow.

### Route team endpoints through controllers and use cases

`GET`/`PATCH /api/teams/[teamId]` and `PATCH /api/teams/[teamId]/lineups` each delegate to a thin use case (`GetTeamUseCase`, `UpdateTeamUseCase`, `UpdateTeamLineupsUseCase`) via a controller, mirroring `createTeamController`, bound with new `TYPES` symbols in the DI container. Rationale: uniform team-route layering and the GET mapping that the lineup display depends on.

### Audit-first one-time migration with resolve-by-existence

Ship an audit script (dry-run) that scans every embedded reference renamed by the schema change — `teams.lineups[]`; for games `teams.{side}.players/staffs/lineup`, `sets[].lineups.{home,away}`, and `sets[].entries[]` rally detail players — and reports how many carry a legacy `_id`, how many resolve to a Player / game snapshot, and how many are empty. Then a migration script renames `_id → playerId`, normalizes empty lineup slots to `{ playerId: null, position }`, and leaves `substitution.players.in/out` (already ObjectId, well-named) intact. The empty-vs-real判準 is "does the legacy `_id` resolve to a Player (team) or a game snapshot (game)"; this is safe because no temporary players exist yet. Game references resolve against the game's own player snapshots. The script is idempotent (references already on `playerId` are skipped). Rationale: every reference moved from `_id` to `playerId` in the schema must migrate or existing reads return `id: null`; there are no orphan ids and likely few recoverable references, so the real DB state must be observed before any destructive rewrite.

### Keep authorization and input guards in the route layer

Routes retain `assertValidObjectId`, `withErrorHandler`/`withAuth`, `verifyIsTeamAdmin` (team PATCH), `verifyTeamRole(..., MEMBER)` (lineups PATCH), and `connectToMongoDB()` before invoking controllers. Rationale: preserves existing access-control behavior; the repository does not manage connections.

## Implementation Contract

**Behavior:**

- `GET /api/teams/[teamId]` returns `TeamView` with team `id` and every lineup player `id` as a hex string or `null`.
- `PATCH /api/teams/[teamId]` (admin) updates name/nickname and returns the mapped team.
- `PATCH /api/teams/[teamId]/lineups` (MEMBER+) persists lineups and returns `LineupView`s with player `id`s preserved (filled slots keep their player id; empty slots return `id: null`).
- `GET /api/games/[gameId]` returns a game whose set lineups, player/staff snapshots, rally detail, and substitution entries expose string player `id`s; saving/updating a game persists client `id`s as `playerId`.

**Interface / data shape:**

- `ITeamRepository.updateLineups(teamId: string, lineups: Lineup[]): Promise<Lineup[]>`.
- New team controllers `getTeamController`, `updateTeamController`, `updateTeamLineupsController` and use cases `GetTeamUseCase`, `UpdateTeamUseCase`, `UpdateTeamLineupsUseCase` bound under new `TYPES` symbols.
- Mongoose field `playerId: ObjectId | null` replaces the player-reference `_id` on the listed subschemas.

**Failure modes:** missing team/game → existing `NotFoundError` (404); invalid team ObjectId → existing `ValidationError` (400); authorization failure → existing `AuthorizationError`; all unchanged.

**Acceptance criteria:**

- Team repository test: `updateLineups` maps a filled `id` to ObjectId on write and back to the same `id` on read, and an empty slot returns `id: null` (object slot, no bare null).
- Game repository test: `toGame` exposes nested player `id`s and `toGameDoc` persists client `id`s as `playerId` (round-trip).
- Existing team route and substitution/optimistic tests pass with `id`-bearing responses.
- Migration audit dry-run produces a report; migration is idempotent and re-runnable.
- Manual: save a lineup with an assigned player and reload — the player remains assigned and renders; create a game from that lineup — the roster shows real players.

**Scope boundaries:**

- In scope: the listed subschema fields, both repositories' read/write mapping, `updateLineups`, the three team routes + their use cases/controllers + DI, the audit and migration scripts, and the two repository unit tests.
- Out of scope: `apiClient` validation, frontend changes beyond the shipped surgical fixes, the temporary-player feature, and any non-player reference fields.

## Risks / Trade-offs

- [Real production data state is unknown; references may have been dropped on prior writes] → Audit script runs first (dry-run) so migration decisions are based on observed data, not assumptions.
- [Renaming the shared lineupSchema field affects game persistence and reads simultaneously] → Centralize mapping in both repositories and migrate team and game documents together in one idempotent script.
- [Thin pass-through team use cases add ceremony] → Accepted to satisfy uniform Clean Architecture layering for team routes; cost is three small files mirroring `CreateTeamUseCase`.
- [Repository unit tests mock Mongoose, so real subdocument behavior is not exercised] → Write mappers make `id ↔ playerId` explicit and independent of Mongoose defaults; manual verification covers the real persistence round-trip.
