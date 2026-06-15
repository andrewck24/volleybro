## ADDED Requirements

### Requirement: Game read responses expose stable player identifiers

The game read path (`GET /api/games/[gameId]`) SHALL map every embedded player reference to a domain `id` string. This SHALL cover set lineups (`sets[].lineups.home/away`), team player and staff snapshots (`teams.{side}.players`, `teams.{side}.staffs`), rally detail players (`sets[].entries[].detail.player`), and substitution entry players (`sets[].entries[].players.in/out`). A referenced player SHALL be exposed as a hex string `id`; an empty lineup slot SHALL be exposed as `id: null`. The response SHALL NOT expose the raw `playerId`/`_id` field.

#### Scenario: Reading a game exposes player ids on lineups and snapshots

- **WHEN** a client reads a game that has assigned lineup players and player snapshots
- **THEN** each set lineup player, team player/staff snapshot, rally detail player, and substitution entry player is exposed with a hex string `id`
- **AND** an empty lineup slot is exposed as `id: null`

#### Scenario: Frontend player matching resolves against mapped ids

- **WHEN** the lineup/substitution UI matches a lineup slot against the team player snapshots by `id`
- **THEN** an assigned slot resolves to its corresponding player snapshot

### Requirement: Game persistence stores client identifiers as references

When a game is created or updated, the game repository SHALL map domain `id` values on embedded players to the stored `playerId` reference before persisting, so client-supplied identifiers are not dropped. An empty lineup slot supplied as `id: null` SHALL persist as a slot object with `playerId: null`.

#### Scenario: Creating a game persists roster and lineup references

- **WHEN** a game is created from a team lineup and roster whose players carry `id` values
- **THEN** the persisted game stores each player reference as `playerId`
- **AND** reading the game back exposes the same player `id` values

##### Example: lineup player round-trips through game persistence

- **GIVEN** a created game whose home starting slot 0 references player `id` `"64b000000000000000000001"`
- **WHEN** the game is read back via the game read path
- **THEN** that slot exposes `id: "64b000000000000000000001"`

### Requirement: Existing embedded references migrate to the playerId field

A one-time, idempotent migration SHALL convert existing embedded player references stored under the legacy `_id` path to the `playerId` field and SHALL normalize empty lineup slots to `playerId: null`. The scope SHALL cover every reference renamed by the schema change: `teams.lineups[]`; for games `teams.{side}.players`, `teams.{side}.staffs`, `teams.{side}.lineup`, `sets[].lineups.{home,away}`, and `sets[].entries[]` rally detail players. `substitution.players.in/out` SHALL be left intact. The migration SHALL be preceded by an audit that reports, without writing, how many embedded references carry a legacy `_id`, how many resolve to a Player or game snapshot, and how many are empty.

#### Scenario: Audit reports existing data state without writing

- **WHEN** the audit script runs against the database
- **THEN** it reports counts of legacy-referenced, resolvable, and empty embedded slots and makes no modifications

#### Scenario: Migration is idempotent

- **WHEN** the migration script runs twice
- **THEN** the second run makes no further changes because slots already use `playerId`
