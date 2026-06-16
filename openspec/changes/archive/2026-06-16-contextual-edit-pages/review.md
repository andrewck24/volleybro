# Code Review: contextual-edit-pages

Post-implementation review findings for the `contextual-edit-pages` change.
Issues sourced from `issues.md`. Status updated as fixes land.

---

## Status Summary

| # | Title | Severity | Status |
| - | ----- | -------- | ------ |
| 1 | Modal pages swallow API errors as success | Bug | ✅ Fixed — commit `4f75f62` |
| 2 | `useFormDraft` reads sessionStorage during render (hydration mismatch) | Bug | ✅ Fixed |
| 3 | `sub.id` sentinel inconsistency (`""` vs `null`) | Minor | ✅ Fixed |
| 4 | Malformed lineup `id` surfaces as 500 instead of 400 | Minor | 🔲 Pending |
| 5 | Test coverage gap on new team routes | Enhancement | 🔲 Pending |
| 6 | Global mutable flag in `useLeavePageWarning` | Nit | 🔲 Pending |

---

## Issue #1: Modal pages swallow API errors as success

**File**: `src/app/(tabs)/@modal/(...)team/[teamId]/edit/page.tsx`,
`src/app/(tabs)/@modal/(...)team/new/page.tsx`

**Root cause**: `onSubmit` used raw `fetch()` and never checked `res.ok`. A 4xx/5xx
response resolved normally (error body = JSON), got merged into the SWR cache, and the
dialog closed. `TeamForm.handleSubmit`'s `catch` block never fired because nothing threw.

**Fix**: Replaced `fetch()` with `apiClient<TeamView>()` in both modal pages, matching the
workspace variants (`EditTeamWorkspace` / `NewTeamWorkspace`). `apiClient` throws
`ApiClientError` on `!res.ok`, which propagates to `form.setError("root", ...)`.

**Tests added**: `edit/__tests__/page.test.tsx`, `new/__tests__/page.test.tsx`
— cover error path (error message shown, dialog stays open) and success path
(SWR cache updated, router called).

---

## Issue #2: `useFormDraft` reads sessionStorage during render (hydration mismatch)

**File**: `src/hooks/use-form-draft.ts`

**Root cause**: `sessionStorage.getItem(key)` was called directly during the render phase.
On SSR the call returns `undefined` (or throws); on the client it returns the draft.
React sees different `defaultValues` between server and client and emits a hydration warning.

**Fix**: Replaced the direct storage read with `useSyncExternalStore`, providing:

- `subscribe`: a no-op unsubscribe (`() => () => {}`) — storage doesn't need reactive updates here
- `getSnapshot`: reads `sessionStorage.getItem(key)` on the client
- `getServerSnapshot`: always returns `null`

React guarantees the server snapshot is used during SSR/hydration and the client
snapshot takes over after mount, eliminating the mismatch without a two-pass render.

---

## Issue #3: `sub.id` sentinel inconsistency (`""` vs `null`)

**Files**: `src/entities/team.ts`, `src/infrastructure/db/repositories/team.repository.mongo.ts`,
`src/infrastructure/db/repositories/game.repository.mongo.ts`,
`src/lib/features/game/types.ts`, `src/lib/features/team/types.ts`,
`src/lib/features/game/hooks/use-lineup.ts`

**Root cause**: `LineupPlayer.id` uses `null` to represent "no player", but `LineupPlayer.sub.id`
used `""` (empty string) as the empty sentinel. This asymmetry meant callers had to handle
two different absent values, and the Zod schemas typed `sub.id` as non-nullable `z.string()`.

**Fix**: Changed `sub.id` to `string | null` throughout the stack:

- `entities/team.ts`: `sub?: { id: string | null; ... }`
- Both Mongo repositories: `p.sub.playerId?.toString() ?? null` (was `?? ""`)
- Both `*types.ts` Zod schemas: `id: z.string().nullable()` for `LineupPlayerResponseSchema`
- `use-lineup.ts` (`mapPlayer`): `id: subPlayer?.id ?? null` to resolve `string | undefined` → `string | null`
