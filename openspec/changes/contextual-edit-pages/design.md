## Context

The `(protected)` route group currently provides the tab navigation shell (persistent DOM, bottom nav, scroll restoration). All edit pages — team edit, player create/edit, lineup, team create — live inside this group as parallel route slots under `@team`. This means every edit page renders with the bottom navigation bar visible, consuming ~80px of viewport height on mobile during focused editing tasks.

The `use-on-leave-page.js` hook was written but never imported anywhere in the codebase. Team and player forms use raw `useState` + manual `ZodError` parsing while game forms already use React Hook Form. This inconsistency will worsen as entity field counts grow.

## Goals / Non-Goals

**Goals:**

- Reclaim full mobile viewport for edit operations by rendering edit pages as Dialogs that overlay the tab context, with an option to maximize to a workspace route outside the tab layout
- Support Gmail-style maximize: Dialog header contains a maximize button that navigates to the workspace version; sessionStorage preserves mid-fill form state across the transition
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

A `@modal` parallel slot is added to the `(tabs)` layout. Intercepting route files at `src/app/(tabs)/@modal/(...)team/...` capture soft-navigation to `/team/...` edit URLs when navigating from within the tab context, rendering the edit UI as a Dialog instead of a workspace route. Direct URL access (hard navigation) bypasses the intercepting route and renders the workspace version at `src/app/(workspace)/team/...`.

Alternative considered: Inline modals triggered by buttons without URL change — rejected because it breaks browser back button, direct linking, and copy-paste URL sharing.

### Full-page edit routes at app/(workspace)/team/ (workspace mode)

Routes under `src/app/(workspace)/team/[teamId]/` render without the `(tabs)` layout (no bottom nav). Shared workspace structure is owned by `src/app/(workspace)/layout.tsx` (`WorkspaceLayout`) so team-specific layouts do not duplicate shell behavior. Workspace `<main>` includes safe-area top/bottom padding and the same content width constraint as tabs content: `mx-auto w-full max-w-196`.

This mirrors the existing pattern in `src/app/game/[gameId]/` (game routes are outside all route groups, have their own layout wrapper, per-page Header).

### Dialog as the modal component (not Sheet)

The project's shadcn Dialog already slides in from the bottom on mobile (consistent with iOS sheet behavior). Dialog is more appropriate than Sheet because:
- It works identically on desktop (centered modal) and mobile (bottom sheet)
- The maximize affordance (→ workspace) is a standard dialog header action

### Dialog lg size width alignment

`src/components/ui/dialog.tsx` `DialogContent` variant `size="lg"` SHALL use `max-w-196` to align horizontal bounds with tabs/workspace containers and reduce layout jumps when switching between modal mode and workspace mode.

### Maximize using shared sessionStorage key

When the user clicks the maximize button in the Dialog header, the app uses hard navigation (`window.location.assign('/team/[teamId]/edit')`). This bypasses intercepting-route capture and guarantees transition from modal mode to workspace mode. The workspace version uses the same `useFormDraft` key (`draft:team:{teamId}`) as the modal version. On mount, the workspace form reads from sessionStorage and restores state. The modal is unmounted by navigation — no state synchronization needed beyond sessionStorage.

Minimize (workspace → Dialog) is not implemented. Users return to the tab context via the Header back button.

### React Hook Form unified across team/player forms

Team/player forms currently use raw `useState` + manual ZodError handling. Game forms already use RHF with `zodResolver`. Migrating team/player forms to RHF:
- Eliminates manual error state management (ZodError caught, mapped, stored)
- Uses existing `src/components/ui/form.tsx` (`FormProvider`, `FormField`, `FormMessage`) — no new UI components
- `FormLabel` already includes `<FormMessage />` so error display is zero additional JSX
- Server errors use `form.setError('root', { message })` or toast (per existing pattern)

### Workspace wrappers and loading strategy

Page-only wrappers are named `*Workspace` (not `*Screen`) to align with workspace mode terminology and lower naming complexity. These wrappers host workspace-only structure (for example Card layout), while modal mode keeps the base form content.

`*Workspace` components SHALL be co-located in the same file as the base form component (for example `EditTeamWorkspace` lives in `src/components/team/form.tsx` alongside `TeamForm`). A separate `workspace/` directory SHALL NOT be created — co-location avoids an extra indirection layer for components that are tightly coupled to their base form.

For async defaults in RHF:
- Base form owns hooks and submit logic (client component)
- Route `page.tsx` becomes server component and only resolves params/placement
- Async entity data syncs into RHF with `form.reset(...)` at controlled timing
- Do not blindly overwrite user input: if draft exists or form is dirty, keep current values

### Dialog header scroll containment

`EditDialogContainer` SHALL wrap `{children}` in an `overflow-y-auto` div (not apply `sticky`/`fixed` to `DialogHeader`). This makes `DialogContent` the scroll boundary — the header is naturally pinned at the top while only the form content scrolls. Using `sticky top-0` on the header does not work reliably because `sticky` requires an overflow-scrolling ancestor, which `DialogContent` does not guarantee.

### EditDialogContainer replaces EditDialogShell

`src/components/layout/edit-dialog-container.tsx` is the canonical dialog shell. `src/components/team/edit-dialog-shell.tsx` SHALL be deleted once all modal pages have been migrated to use `EditDialogContainer`. No new code SHALL import `EditDialogShell`.

### teamId propagation guard

Navigation links that construct `/team/{teamId}/...` URLs SHALL use the `teamId` route param directly (not `team.id` from a SWR-loaded entity). Using a loaded entity's id introduces a window where the link renders before data is available, which interpolates `undefined` into the URL and produces requests to `/api/teams/undefined`. Route params are always resolved before the component renders.

### Frontend error toast reason mapping

`showErrorToast` in `src/lib/api/error-toast.ts` SHALL include a `reason` → zh-TW message mapping table for known operational errors (4xx), per the error-handling spec requirement that components use component-local zh-TW strings keyed by `error.reason`. For reasons not in the mapping table, `error.detail` (en-US backend string) remains the fallback.

This avoids requiring every call site to duplicate reason-to-message mappings for globally known errors such as `RESOURCE_NOT_FOUND` or `INVALID_INPUT`, while remaining consistent with the error-handling spec's intent.

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

[Risk] Next.js intercepting routes + parallel slots have known edge cases (cache invalidation, hard-refresh behavior) → Mitigation: each slot directory includes `default.tsx` returning null (already required by existing tab-navigation spec); the workspace routes at `app/(workspace)/team/` serve as the hard-refresh fallback

[Risk] Large directory rename `(protected)` → `(tabs)` may break absolute imports if any file imports from a path containing the group name → Mitigation: route group names are not part of URLs or import paths in Next.js; only `src/app/(protected)/layout.tsx` is directly referenced and only by its own file tree

[Risk] sessionStorage key collisions if two tabs edit the same entity simultaneously → Mitigation: sessionStorage is tab-scoped by design; two browser tabs have separate sessionStorage instances

[Risk] RHF migration changes form behavior (validation timing, error display) → Mitigation: default RHF mode is `onSubmit`, matching current manual Zod-on-submit behavior; `FormLabel` includes `FormMessage` so errors appear inline as before

## Migration Plan

1. Rename `src/app/(protected)/` → `src/app/(tabs)/` (git mv)
2. Create `src/app/(tabs)/@modal/` intercepting routes (renders Dialogs)
3. Create `src/app/(workspace)/layout.tsx` and place full-page routes in `src/app/(workspace)/team/`
4. Add `useFormDraft` and `useLeavePageWarning` hooks
5. Migrate `create-form.tsx` and `edit-form.tsx` to RHF + `useFormDraft`
6. Update `(tabs)/layout.tsx` to pass `modal` slot to `TabContainer`
7. Delete `src/hooks/use-on-leave-page.js`
8. Verify: hard refresh on each route; soft nav from tab; maximize flow; form dirty warning

No database changes. URL structure is unchanged (`/team/...`) while route-group structure changes to `(workspace)`.

## API Error Semantics

- Invalid `teamId` format (for example non-ObjectId string) SHALL return `400 VALIDATION`
- Valid `teamId` format with no matching team SHALL return `404 NOT_FOUND`
- Workspace team-not-found UI SHALL render page-level `Alert` with a single `返回` action, instead of toast-only feedback

## Open Questions

(none — all decisions confirmed in design discussion)
