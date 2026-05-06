## Context

The `(protected)` route group currently provides the tab navigation shell (persistent DOM, bottom nav, scroll restoration). All edit pages — team edit, player create/edit, lineup, team create — live inside this group as parallel route slots under `@team`. This means every edit page renders with the bottom navigation bar visible, consuming ~80px of viewport height on mobile during focused editing tasks.

The `use-on-leave-page.js` hook was written but never imported anywhere in the codebase. Team and player forms use raw `useState` + manual `ZodError` parsing while game forms already use React Hook Form. This inconsistency will worsen as entity field counts grow.

## Goals / Non-Goals

**Goals:**

- Reclaim full mobile viewport for edit operations by rendering edit pages as Dialogs that overlay the tab context, with an option to maximize to a full-page route outside the tab layout
- Support Gmail-style maximize: Dialog header contains a maximize button that navigates to the full-page version; sessionStorage preserves mid-fill form state across the transition
- Rename `(protected)` → `(tabs)` to match actual responsibility
- Unify all team/player forms to React Hook Form with automatic draft persistence via sessionStorage
- Replace `use-on-leave-page.js` (dead code) with a typed `useLeavePageWarning(isDirty)` hook

**Non-Goals:**

- Auth enforcement — `(tabs)` has never contained auth logic; auth is handled by Better Auth middleware at the API layer. This rename does not introduce or remove any auth gate.
- Player detail page (`players/[playerId]`) — view-only, not an edit page
- `create-team-entry-point` — adding a UI button to navigate to team creation is a separate future change
- `refactor-game-new-multi-step` — game creation form multi-step refactor is a separate future change; game forms already use RHF
- localStorage for draft persistence — sessionStorage lifecycle (cleared on tab close) is sufficient for ephemeral editing drafts; localStorage lifecycle management overhead is not justified

## Decisions

### Route group renamed from (protected) to (tabs)

`(protected)` implies auth enforcement, but the layout only renders `TabContainer` + `NavigationBar`. Auth is enforced at the API level. Rename makes the folder's purpose unambiguous. All files under `src/app/(protected)/` are moved to `src/app/(tabs)/`.

### Intercepting routes with @modal parallel slot

A `@modal` parallel slot is added to the `(tabs)` layout. Intercepting route files at `src/app/(tabs)/@modal/(...)team/...` capture soft-navigation to `/team/...` edit URLs when navigating from within the tab context, rendering the edit UI as a Dialog instead of a full-page route. Direct URL access (hard navigation) bypasses the intercepting route and renders the full-page version at `src/app/team/...`.

Alternative considered: Inline modals triggered by buttons without URL change — rejected because it breaks browser back button, direct linking, and copy-paste URL sharing.

### Full-page edit routes at app/team/ (outside (tabs))

Top-level `src/app/team/[teamId]/` routes render without the `(tabs)` layout (no bottom nav). They use `src/app/team/[teamId]/layout.tsx` as a structural wrapper (provides `<main>` with safe-area padding). Each page renders its own `<Header>` since titles differ across sub-routes.

This mirrors the existing pattern in `src/app/game/[gameId]/` (game routes are outside all route groups, have their own layout wrapper, per-page Header).

### Dialog as the modal component (not Sheet)

The project's shadcn Dialog already slides in from the bottom on mobile (consistent with iOS sheet behavior). Dialog is more appropriate than Sheet because:
- It works identically on desktop (centered modal) and mobile (bottom sheet)
- The maximize affordance (→ full-page) is a standard dialog header action

### Maximize using shared sessionStorage key

When the user clicks the maximize button in the Dialog header, the app calls `router.push('/team/[teamId]/edit')`. The full-page version uses the same `useFormDraft` key (`draft:team:{teamId}`) as the modal version. On mount, the full-page form reads from sessionStorage and restores state. The modal is unmounted by Next.js as part of the route change — no state synchronization needed beyond sessionStorage.

Minimize (full-page → Dialog) is not implemented. Users return to the tab context via the Header back button.

### React Hook Form unified across team/player forms

Team/player forms currently use raw `useState` + manual ZodError handling. Game forms already use RHF with `zodResolver`. Migrating team/player forms to RHF:
- Eliminates manual error state management (ZodError caught, mapped, stored)
- Uses existing `src/components/ui/form.tsx` (`FormProvider`, `FormField`, `FormMessage`) — no new UI components
- `FormLabel` already includes `<FormMessage />` so error display is zero additional JSX
- Server errors use `form.setError('root', { message })` or toast (per existing pattern)

### useFormDraft hook: RHF + sessionStorage

A custom hook wraps `useForm` and adds:
1. On init: reads `sessionStorage.getItem(key)` and uses parsed value as `defaultValues` if present
2. `form.watch` subscription: debounce-free write to sessionStorage on every value change
3. Returns `clearDraft()` that calls `sessionStorage.removeItem(key)`

Key format: `draft:{type}:{id}` where type is `team`, `player`, or `lineup`, and id is the entity ID (or `new` for creation forms).

Callers invoke `clearDraft()` on submit success and on explicit cancel (Dialog close confirmed by user).

### useLeavePageWarning: beforeunload only

The hook accepts `isDirty: boolean` and registers/deregisters a `beforeunload` handler. Soft-navigation blocking is not implemented because Next.js App Router has no stable blocker API. The Dialog close button instead shows a shadcn `AlertDialog` confirmation when `form.formState.isDirty` is true, which covers the primary accidental-close scenario. SessionStorage draft preservation means soft navigation without confirmation loses nothing (draft is restored on return).

## Risks / Trade-offs

[Risk] Next.js intercepting routes + parallel slots have known edge cases (cache invalidation, hard-refresh behavior) → Mitigation: each slot directory includes `default.tsx` returning null (already required by existing tab-navigation spec); the full-page routes at `app/team/` serve as the hard-refresh fallback

[Risk] Large directory rename `(protected)` → `(tabs)` may break absolute imports if any file imports from a path containing the group name → Mitigation: route group names are not part of URLs or import paths in Next.js; only `src/app/(protected)/layout.tsx` is directly referenced and only by its own file tree

[Risk] sessionStorage key collisions if two tabs edit the same entity simultaneously → Mitigation: sessionStorage is tab-scoped by design; two browser tabs have separate sessionStorage instances

[Risk] RHF migration changes form behavior (validation timing, error display) → Mitigation: default RHF mode is `onSubmit`, matching current manual Zod-on-submit behavior; `FormLabel` includes `FormMessage` so errors appear inline as before

## Migration Plan

1. Rename `src/app/(protected)/` → `src/app/(tabs)/` (git mv)
2. Create `src/app/(tabs)/@modal/` intercepting routes (renders Dialogs)
3. Create `src/app/team/` full-page routes
4. Add `useFormDraft` and `useLeavePageWarning` hooks
5. Migrate `create-form.tsx` and `edit-form.tsx` to RHF + `useFormDraft`
6. Update `(tabs)/layout.tsx` to pass `modal` slot to `TabContainer`
7. Delete `src/hooks/use-on-leave-page.js`
8. Verify: hard refresh on each route; soft nav from tab; maximize flow; form dirty warning

No database changes. No API changes. No breaking changes to URL structure (same routes, new rendering context).

## Open Questions

(none — all decisions confirmed in design discussion)
