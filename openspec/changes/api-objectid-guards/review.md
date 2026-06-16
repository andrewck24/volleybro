# Code Review: api-objectid-guards

Post-implementation review findings. Status updated as fixes land.

---

## Status Summary

| #  | Title                                               | Severity | Status  |
|----|-----------------------------------------------------|----------|---------|
| 1  | Silent green tests — try/catch without `expect.assertions` | Bug | ✅ Fixed |
| 2  | Duplicate `OBJECT_ID_RE` in `team.ts` and `guards.ts` | Nit  | ✅ Fixed |

---

## Issue #1: Silent green tests — try/catch without `expect.assertions`

**File**: `src/lib/api/__tests__/guards.test.ts`, lines 31–50

**Root cause**: Two tests ("includes the param name in the error detail" and "uses default param name 'id' when param is omitted") place all their `expect(...)` calls inside a `catch` block with no `expect.assertions(N)` guard. If `assertObjectId` does not throw, the catch block is skipped entirely and Jest records 0 assertions — the tests pass silently (false green).

**Trigger**: Refactor `assertObjectId` into a no-op, or make the import resolve to a stub. Both tests remain green while the guard is broken.

**Fix**: Added `expect.assertions(N)` at the top of each affected test so Jest fails when the catch is never entered.

---

## Issue #2: Duplicate `OBJECT_ID_RE` in `team.ts` and `guards.ts`

**Files**: `src/lib/validations/team.ts` line 4, `src/lib/api/guards.ts` line 4

**Root cause**: Both files independently define `const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/` for the same purpose (MongoDB ObjectId format validation). Neither references the other. The regex in `team.ts` is module-private (not exported).

**Risk**: If the ObjectId format check ever needs to change (e.g. to support a different ID scheme), both definitions must be updated in sync. No centralised utility existed before this PR.

**Fix**: Extract `OBJECT_ID_RE` from `guards.ts` as an exported constant and import it in `team.ts`.

---

## Investigated but Not Flagged

- **`/api/users/[userId]/players` missing guard** (REFUTED): Better Auth `userId` is a nanoid string, not a 24-hex-char MongoDB ObjectId. Applying `assertObjectId` would always reject valid authenticated users. No guard is appropriate here.
- **Error message change** ("Invalid team ID format" → "Invalid teamId format"): No downstream code matches on the detail string; error handlers key on `code`/`reason` only. No client breakage.
- **`connectToMongoDB` reordering in game routes**: Now called after `assertObjectId` — this is correct fail-fast behaviour, not a regression.
