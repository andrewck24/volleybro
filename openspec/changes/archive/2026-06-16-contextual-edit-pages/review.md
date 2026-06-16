# Code Review: contextual-edit-pages

Post-implementation review findings for the `contextual-edit-pages` change.
Issues sourced from `issues.md`. Status updated as fixes land.

---

## Status Summary

| # | Title | Severity | Status |
| - | ----- | -------- | ------ |
| 1 | Modal pages swallow API errors as success | Bug | ✅ Fixed — commit `4f75f62` |
| 2 | `useFormDraft` reads sessionStorage during render (hydration mismatch) | Bug | 🔲 Pending |
| 3 | `sub.id` sentinel inconsistency (`""` vs `null`) | Minor | 🔲 Pending |
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
