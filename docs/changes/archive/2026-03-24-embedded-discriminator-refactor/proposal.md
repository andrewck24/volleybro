## Summary

Refactor the `Entry` type from a nested `{ type, data: { ...fields } }` structure to a flat `{ type, ...fields }` structure, wire Mongoose embedded discriminators for runtime validation, and convert `EntryType` from a numeric enum to a semantic string enum (`"Rally"`, `"Substitution"`, `"Timeout"`, `"Challenge"`).

## Motivation

The `entries` array in each set currently has three issues:

1. **No runtime validation** — `entrySchema` uses `Schema.Types.Mixed` for `data`, so Mongoose accepts any shape, deferring all validation to application code
2. **Unused schemas** — `rallySchema`, `substitutionSchema`, `timeoutSchema`, and `challengeSchema` are defined but never wired into the schema tree, producing 4 `no-unused-vars` lint warnings
3. **Unnecessary nesting** — The `data` wrapper forces 15+ unsafe `as Type` casts (`entry.data as Rally`) across the codebase and prevents TypeScript discriminated union auto-narrowing

Mongoose embedded discriminators (`DocumentArray.discriminator()`) place type-specific fields **at the subdocument root**, making the `data` wrapper unnecessary. Flattening the structure aligns with Mongoose's natural behavior and enables `if (entry.type === "RALLY") entry.win` without casts.

## Proposed Solution

1. **Convert `EntryType` to a string enum** — `RALLY = "RALLY"`, `SUBSTITUTION = "SUBSTITUTION"`, etc. (TypeScript best practice for serialized enums)
2. **Flatten `Entry` type** — Remove the `data` wrapper: `{ type: "RALLY"; win: boolean; home: RallyDetail; away: RallyDetail }` instead of `{ type: EntryType.RALLY; data: Rally }`
3. **Rename `Challenge.type` to `Challenge.challengeType`** — Avoids collision with the discriminatorKey `type` field at the subdocument root
4. **Wire embedded discriminators** — Register type-specific schemas on the `entries` DocumentArray using `type` as discriminatorKey
5. **Migration script** — One-time MongoDB script to flatten existing `data` fields and convert numeric `type` values to strings. Script lives in the change directory and archives with the change.
6. **Update all layers** — Entity types, Redux slice, components, helpers, use cases, and tests

## Alternatives Considered

- **Keep `data` wrapper**: Would preserve current structure but fights Mongoose discriminator behavior, preserves unsafe casts, and adds unnecessary nesting
- **Keep numeric enum**: Mongoose discriminators use string names internally; storing numbers as discriminator values is undocumented and fragile
- **Manual validation only**: Doesn't leverage Mongoose's built-in pipeline and leaves schemas unused

## Impact

- Affected entity: `src/entities/record.ts` — `Entry` type, `EntryType` enum, `Challenge.type` rename
- Affected schema: `src/infrastructure/db/mongoose/schemas/record.ts` — discriminator wiring, remove `data: Mixed`
- Affected Redux: `src/lib/features/record/record-slice.ts` — all `entry.data` access patterns
- Affected components: `src/components/record/` — entry rendering and construction
- Affected helpers: `src/lib/features/record/helpers/` — optimistic updates, query helpers
- Affected use cases: `src/applications/usecases/record/` — entry construction
- Affected repository: `src/infrastructure/db/repositories/record.repository.mongo.ts` — aggregation pipeline
- Affected tests: All test files constructing or asserting on `Entry` objects (~10 files)
- Migration: One-time script for existing MongoDB documents
- Resolves 4 `no-unused-vars` lint warnings + eliminates 15+ unsafe type casts
