## 1. TypeScript Upgrade and tsconfig.json Changes

- [ ] 1.1 Upgrade `typescript` from `^5.9.3` to `6.0.2` in `package.json` and run `npm install`
- [ ] 1.2 Apply tsconfig.json Changes and experimentalDecorators Decision: set `target` to `es2025`, set `strict` to `true`, remove `dom.iterable` from `lib`, add `noUncheckedSideEffectImports: true`; keep `experimentalDecorators` and `emitDecoratorMetadata` per experimentalDecorators Decision (required by InversifyJS) and add TODO comment for future TS7 migration
- [ ] 1.3 Verify Toolchain Compatibility Verification: run `npx tsc --version` (confirm 6.0.2), `npm run lint`, `npm test`, `npm run build`; if any toolchain package fails, upgrade it before proceeding

## 2. Strict Mode Fix Strategy — Domain Layer

- [ ] 2.1 Fix strict mode errors in `src/entities/` following the Strict Mode Fix Strategy: add type annotations, null guards, and type narrowing for TS18048/TS2345/TS2322/TS7053 errors
- [ ] 2.2 Verify: `npx tsc --noEmit && npm test`

## 3. Strict Mode Fix Strategy — Application Layer

- [ ] 3.1 Fix strict mode errors in `src/applications/` following the Strict Mode Fix Strategy: add type annotations, null guards, and explicit types for use case parameters and repository interfaces
- [ ] 3.2 Verify: `npx tsc --noEmit && npm test`

## 4. Strict Mode Fix Strategy — Infrastructure Layer

- [ ] 4.1 Fix strict mode errors in `src/infrastructure/` following the Strict Mode Fix Strategy: add type annotations and null guards for MongoDB repository implementations and service classes
- [ ] 4.2 Verify: `npx tsc --noEmit && npm test`

## 5. Strict Mode Fix Strategy — Interface Layer

- [ ] 5.1 Fix strict mode errors in `src/interface/` following the Strict Mode Fix Strategy: add type annotations for controller parameters and response types
- [ ] 5.2 Verify: `npx tsc --noEmit && npm test`

## 6. Strict Mode Fix Strategy — Presentation Layer (Record & Lib)

- [ ] 6.1 Fix strict mode errors in `src/components/record/` following the Strict Mode Fix Strategy: add null guards and type narrowing for record panel, set-options, substitutes, and moves components
- [ ] 6.2 Fix strict mode errors in `src/lib/features/record/` following the Strict Mode Fix Strategy: add type annotations and null guards for record-related Redux slices and utilities
- [ ] 6.3 Verify: `npx tsc --noEmit && npm test`

## 7. Strict Mode Fix Strategy — Presentation Layer (Remaining Components & App)

- [ ] 7.1 Fix strict mode errors in remaining `src/components/` directories (auth, team, match, home, custom, ui) following the Strict Mode Fix Strategy
- [ ] 7.2 Fix strict mode errors in `src/app/` following the Strict Mode Fix Strategy: add type annotations for page and layout components
- [ ] 7.3 Fix strict mode errors in any remaining files (tests, config, etc.) following the Strict Mode Fix Strategy
- [ ] 7.4 Verify: `npx tsc --noEmit && npm test`

## 8. Final Verification and Documentation

- [ ] 8.1 Full verification: `npm test && npx tsc --noEmit && npm run lint && npm run build`
- [ ] 8.2 Review whether `docs/`, `README.md`, `openspec/config.yaml`, and `CLAUDE.md` need updating based on this change
