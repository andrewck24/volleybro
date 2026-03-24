## 1. Domain Layer — Entity type changes

- [x] 1.1 Convert EntryType to semantic string enum and rename Challenge.type to Challenge.challengeType (domain layer: `src/entities/record.ts`)
- [x] 1.2 Flatten entry structure and remove `data` wrapper — define `RallyEntry`, `SubstitutionEntry`, `TimeoutEntry`, `ChallengeEntry` variant types, and add entry construction helpers (domain layer: `src/entities/record.ts`)
- [x] 1.3 Update entity-layer tests and test fixtures for flat entry structure and string enum (`src/__tests__/helpers/fixtures.ts`)

## 2. Infrastructure Layer — Mongoose schema and repository

- [x] 2.1 Implement discriminator wiring pattern — remove `data: Mixed`, register `rallySchema`, `substitutionSchema`, `timeoutSchema`, `challengeSchema` as embedded discriminators on `entries` DocumentArray (infra layer: `src/infrastructure/db/mongoose/schemas/record.ts`)
- [x] 2.2 Update `record.repository.mongo.ts` aggregation pipeline for flat entry structure and string `type` values (infra layer)
- [x] 2.3 Update repository tests for embedded discriminator validation and flat entries (`src/infrastructure/db/repositories/__tests__/record.repository.test.ts`)

## 3. Application Layer — Use cases

- [x] [P] 3.1 Update record use cases for flat entry construction — rally, substitution, timeout, challenge use cases (`src/applications/usecases/record/`)
- [x] [P] 3.2 Update use case tests for flat entry structure (`src/applications/usecases/record/__tests__/`)

## 4. Presentation Layer — Redux, helpers, components

- [ ] 4.1 Update Redux record-slice for flat entry access — remove all `entry.data as Type` casts (`src/lib/features/record/record-slice.ts`)
- [ ] [P] 4.2 Update record helpers — optimistic update helpers and query helpers for flat entries (`src/lib/features/record/helpers/`)
- [ ] [P] 4.3 Update record components — entry rendering and entry construction (`src/components/record/`)
- [ ] [P] 4.4 Update record hooks for flat entry access (`src/lib/features/record/hooks/`)

## 5. Migration Script

- [ ] 5.1 Write migration script in change directory — numeric-to-string type conversion, flatten `data` fields, rename challenge `type` to `challengeType` (`openspec/changes/embedded-discriminator-refactor/migrate.ts`)

## 6. Verification

- [ ] 6.1 Run `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` — all must pass with zero errors
