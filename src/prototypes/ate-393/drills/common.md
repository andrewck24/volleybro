You are doing ONE maintenance task on a throwaway prototype branch. Read src/prototypes/ate-393/NOTES.md and src/prototypes/ate-393/team-variants.ts and src/prototypes/ate-393/**tests**/team-behavior.test.ts first.

Scope: change ONLY the create-team variant named below (its code path in src/prototypes/ate-393/ and its tests). Do not change other variants' behaviour, production files, or scripts. You may add new files under src/prototypes/ate-393/. If a production port lacks a method you need, declare the extended port type inside src/prototypes/ate-393/ and extend the test fakes there.

Write the change in that variant's own idiom (async variants: throw-based AppError classes from src/entities/errors; Effect variants: tagged errors in the E channel, mapped to AppError at the boundary). Add or update tests in the shared suite proving the new behaviour for this variant through the route path the suite already uses. Finish with `pnpm typecheck` and `npx jest --selectProjects backend --testPathPatterns src/prototypes/ate-393` both passing. Do not commit. Final message: one paragraph on what you changed.

Variant: VARIANT
Task:
