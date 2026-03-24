## Context

The `entries` array in each `Set` document stores polymorphic subdocuments — rallies, substitutions, timeouts, and challenges — each identified by a `type` field (`EntryType` enum). Currently:

- **Mongoose schema**: `entrySchema` uses `data: Schema.Types.Mixed`, providing zero runtime validation. Four type-specific schemas exist but are never wired.
- **TypeScript entity**: `Entry` is a discriminated union with a `data` wrapper: `{ type: EntryType.RALLY; data: Rally }`.
- **EntryType**: A numeric enum (`RALLY = 0, SUBSTITUTION = 1, ...`).
- **No DTO layer**: Entity types are used directly from infrastructure through presentation — every layer accesses `entry.data.field` with unsafe casts.

Mongoose embedded discriminators (`DocumentArray.discriminator()`) add type-specific fields at the **subdocument root level** (flat), not nested under a wrapper.

## Goals / Non-Goals

**Goals:**

- Flatten `Entry` from `{ type, data: { ...fields } }` to `{ type, ...fields }`
- Convert `EntryType` from numeric to semantic string enum (`"Rally"`, `"Substitution"`, `"Timeout"`, `"Challenge"`)
- Wire existing type-specific schemas as embedded discriminators
- Enable Mongoose runtime validation per entry type
- Eliminate unsafe `as Type` casts for entry data access
- Resolve 4 `no-unused-vars` lint warnings
- Provide a one-time migration script for existing MongoDB documents

**Non-Goals:**

- Introducing a DTO/mapper layer between infrastructure and domain
- Changing match recording business logic
- Adding new entry types
- Modifying API contracts (entry structure is internal to the record document)

## Decisions

### Flatten entry structure and remove `data` wrapper

Change `Entry` from `{ type: "Rally"; data: Rally }` to `{ type: "Rally" } & Rally` (intersection type).

After flattening, TypeScript auto-narrowing works:

```typescript
// Before: unsafe cast required
const rally = entry.data as Rally;
rally.win;

// After: auto-narrows on type check
if (entry.type === "Rally") {
  entry.win; // TypeScript knows this is RallyEntry
}
```

**Why:** Mongoose discriminators place fields at the subdocument root. A `data` wrapper would fight the framework and preserve the casting problem.

**Alternative rejected:** Keep `data` wrapper — adds unnecessary nesting and prevents TypeScript narrowing.

### Convert EntryType to semantic string enum

```typescript
// Before
export enum EntryType {
  RALLY,        // 0
  SUBSTITUTION, // 1
  TIMEOUT,      // 2
  CHALLENGE,    // 3
}

// After
export enum EntryType {
  Rally = "Rally",
  Substitution = "Substitution",
  Timeout = "Timeout",
  Challenge = "Challenge",
}
```

**Why:** Mongoose `discriminator(name, schema)` stores `name` as the `type` field value — it's inherently string-based. Numeric discriminator names are undocumented and fragile. PascalCase semantic string values align with Mongoose discriminator conventions and are readable in database queries.

**Alternative rejected:** Keep numeric enum and register discriminators as `"0"`, `"1"` — fragile, unreadable, undocumented behavior.

### Rename Challenge.type to Challenge.challengeType

The `Challenge` entity has `type: string` (the kind of challenge, e.g., video review). After flattening, this collides with `Entry.type` (the discriminatorKey).

```typescript
// Before
export type Challenge = { team: Side; type: string; success: boolean };

// After
export type Challenge = { team: Side; challengeType: string; success: boolean };
```

**Why:** `type` at the subdocument root is reserved for the discriminatorKey. `challengeType` is unambiguous and descriptive.

**Alternative rejected:** Use a custom discriminatorKey (e.g., `entryType`) — rejected because `type` is the established convention and matches the entity type pattern.

### Discriminator wiring pattern

```typescript
const entrySchema = new Schema(
  { type: { type: String, required: true, enum: Object.values(EntryType) } },
  { discriminatorKey: "type", _id: false }
);

const setSchema = new Schema<SetDocument>({
  // ...
  entries: [entrySchema],
});

const entriesArray = setSchema.path("entries") as Schema.Types.DocumentArray;
entriesArray.discriminator(EntryType.RALLY, rallySchema);
entriesArray.discriminator(EntryType.SUBSTITUTION, substitutionSchema);
entriesArray.discriminator(EntryType.TIMEOUT, timeoutSchema);
entriesArray.discriminator(EntryType.CHALLENGE, challengeSchema);
```

Each type-specific schema defines only its own fields (no `type` field — inherited from base).

### Entry construction helpers

Introduce thin factory functions to replace scattered inline entry construction:

```typescript
export const createRallyEntry = (rally: Rally): RallyEntry => ({
  type: EntryType.RALLY, ...rally
});
```

**Why:** Reduces touchpoints during the refactor and provides a single place to construct entries correctly. Keeps construction logic near the type definitions.

### Migration script in change directory

The migration script lives at `openspec/changes/embedded-discriminator-refactor/migrate.ts` and archives with the change artifacts.

The script:

1. Converts `entries[].type` from numeric (0, 1, 2, 3) to string (`"Rally"`, `"Substitution"`, `"Timeout"`, `"Challenge"`)
2. Lifts `entries[].data.*` fields to `entries[].*` (flatten)
3. Removes the `entries[].data` wrapper field
4. Renames `entries[].challengeType` from `entries[].type` for challenge entries (where `data.type` was the challenge kind)

Uses MongoDB aggregation pipeline update (`$set` + `$unset` with `$map`). Idempotent — safe to re-run. Operates on the `records` collection.

## Risks / Trade-offs

**[Wide blast radius across all layers]** → Flatten touches entity types, Redux slice, components, helpers, use cases, and tests. Mitigation: 587 existing tests provide safety net; implement incrementally by layer; TypeScript compiler catches type mismatches at every step.

**[EntryType numeric-to-string migration]** → Existing documents and any code relying on numeric comparison (`entry.type === 0`) must update. Mitigation: TypeScript compiler flags all type mismatches; string enum is a compile-time change.

**[Existing MongoDB data requires migration]** → Documents must be migrated before the application writes new entries. Mitigation: idempotent migration script; run before deployment.

**[Challenge.type rename]** → Any code referencing `challenge.type` (the challenge kind) must update to `challenge.challengeType`. Mitigation: TypeScript compiler catches all references; limited to Challenge entry paths.
