## Context

The project uses TypeScript 5.9.3 with `strict: false`, `target: ES2017`, and `moduleResolution: bundler`. The codebase has 25 files using InversifyJS decorators (`@injectable`, `@inject`) requiring `experimentalDecorators` and `emitDecoratorMetadata`. The project uses `noEmit: true` (Next.js SWC handles actual compilation), so `target` changes only affect type-checking and lib availability, not emitted code.

Running `tsc --noEmit --strict` reveals ~233 errors across 73 files, with the following breakdown:

- TS18048 (88): value is possibly `undefined` — strict null checks
- TS2345 (40): type argument not assignable — stricter type narrowing
- TS2322 (40): type not assignable — stricter assignment checks
- TS7053 (31): element implicitly has `any` type — index access on objects
- TS7031 (14): binding element implicitly has `any` type
- TS7006 (6): parameter implicitly has `any` type
- TS2339 (5): property does not exist on type
- TS2420 (4): class incorrectly implements interface
- Others (5): miscellaneous strict violations

Major error clusters: `src/components/record/`, `src/applications/usecases/record/`, `src/infrastructure/db/repositories/`, `src/lib/features/record/`.

## Goals / Non-Goals

**Goals:**

- Upgrade `typescript` from 5.9.3 to 6.0.2
- Align `tsconfig.json` settings with TS6/TS7 defaults so future TS7 migration is near-painless
- Enable `strict: true` and fix all resulting type errors
- Ensure all toolchain dependencies (typescript-eslint, ts-jest, eslint-config-next, Storybook) remain compatible
- Pass all existing checks: `npm test && npx tsc --noEmit && npm run lint && npm run build`

**Non-Goals:**

- ESLint major version upgrade (ESLint 10 or typescript-eslint major bump)
- Removing `experimentalDecorators` / `emitDecoratorMetadata` (InversifyJS dependency; rewrite deferred)
- Migrating to TypeScript 7.0 (this change only prepares for it)
- Adding `ignoreDeprecations: "6.0"` (goal is to address deprecations, not suppress)
- Refactoring business logic beyond what strict mode requires

## Decisions

### tsconfig.json Changes

Apply changes in a single commit to `tsconfig.json`:

| Setting                        | Current                                          | New                              | Rationale                                                                                          |
| ------------------------------ | ------------------------------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------- |
| `target`                       | `ES2017`                                         | `es2025`                         | TS6 default; no runtime impact with `noEmit: true`                                                 |
| `strict`                       | `false`                                          | `true`                           | TS6 default; catches 233 type-safety issues                                                        |
| `lib`                          | `["dom", "dom.iterable", "esnext", "webworker"]` | `["dom", "esnext", "webworker"]` | `dom.iterable` merged into `dom` in TS6                                                            |
| `noUncheckedSideEffectImports` | (absent)                                         | `true`                           | TS6 default; catches typos in side-effect imports                                                  |
| `experimentalDecorators`       | `true`                                           | `true` (keep)                    | Required by InversifyJS; add `// TODO: remove when migrating off InversifyJS decorators or to TS7` |
| `emitDecoratorMetadata`        | `true`                                           | `true` (keep)                    | Required by InversifyJS for `__metadata("design:paramtypes", [...])` generation                    |

Settings already aligned (no change needed):

- `module: "esnext"` — already matches TS6 default
- `moduleResolution: "bundler"` — not deprecated, appropriate for bundled web apps
- `types: ["node", "@serwist/next/typings", "reflect-metadata"]` — already explicit
- `esModuleInterop: true` — already aligned
- `paths` without `baseUrl` — already correct pattern
- `noEmit: true` — standard for Next.js projects

### Strict Mode Fix Strategy

Fix errors in dependency order following Clean Architecture layers:

1. **Domain Layer** (`src/entities/`) — fix first, no external dependencies
2. **Application Layer** (`src/applications/`) — fix next, depends only on entities
3. **Infrastructure Layer** (`src/infrastructure/`) — fix after applications
4. **Presentation Layer** (`src/components/`, `src/lib/`, `src/app/`) — fix last

Within each layer, apply these patterns for the common error types:

- **TS18048 / TS2532** (possibly undefined): Add null guards, optional chaining (`?.`), or non-null assertions (`!`) where value is guaranteed by prior logic
- **TS2345 / TS2322** (type not assignable): Add explicit type annotations, narrow with type guards, or fix incorrect type assumptions
- **TS7053** (implicit any index): Add index signature to type, use `Record<string, T>`, or narrow with `in` operator
- **TS7031 / TS7006** (implicit any): Add explicit parameter/binding type annotations
- **TS2339** (property does not exist): Add property to type definition or use type assertion with explanation
- **TS2420** (class incorrectly implements interface): Add missing members or fix return types

Prefer minimal, targeted fixes: add type annotations and null guards rather than restructuring logic.

### Toolchain Compatibility Verification

Before fixing strict errors, verify all toolchain packages work with TS 6.0:

1. `npm install typescript@6.0.2` — install new version
2. `npx tsc --version` — confirm 6.0.2
3. `npm run lint` — verify eslint + typescript-eslint compatibility
4. `npm test` — verify ts-jest compatibility
5. `npm run build` — verify Next.js build with new TS version

If any toolchain package is incompatible, upgrade it as part of this change. Expected compatible packages based on TS6 ecosystem:

- `typescript-eslint` — check for TS6 support
- `ts-jest` — check for TS6 support
- `eslint-config-next` — typically tracks TS versions closely

### experimentalDecorators Decision

Keep `experimentalDecorators: true` and `emitDecoratorMetadata: true` with a TODO comment. Rationale:

- 25 files use `@injectable()` / `@inject(TYPES.xxx)` decorators
- InversifyJS requires `emitDecoratorMetadata` for automatic constructor parameter type resolution
- Removing decorators requires rewriting all DI bindings to explicit factory pattern — architectural change out of scope
- TS7 will not support `emitDecoratorMetadata` emit, but since we use `noEmit: true`, the actual decorator transform is handled by SWC, not tsc. The risk is that TS7 may also change type-checking behavior around legacy decorators.
- If TS7 breaks decorator type-checking, the migration path is: (a) switch InversifyJS to explicit bindings, or (b) adopt TC39 standard decorators if InversifyJS adds support

## Risks / Trade-offs

- **[Risk] Toolchain incompatibility**: Some TS-adjacent packages may not yet support TS 6.0 → Mitigation: check and upgrade during implementation; pin versions if needed
- **[Risk] Strict mode false positives**: Some `!` non-null assertions may mask real bugs → Mitigation: prefer type guards and optional chaining over assertions; review each assertion
- **[Risk] experimentalDecorators in TS7**: TS7 may change decorator behavior → Mitigation: TODO comment tracks the risk; `noEmit: true` reduces blast radius since SWC handles actual emit
- **[Trade-off] 233 errors to fix**: Enabling strict is a large diff touching 73 files → Accepted: strict mode is the TS6 default and catches real bugs; batch fixing is more efficient than incremental enablement of individual strict flags
