## Why

Edit pages (team edit, player create/edit, lineup) currently render as full-page routes inside the `(protected)` layout, which means the persistent bottom navigation bar occupies screen real estate during focused editing tasks on mobile. Users have no way to get a full-screen editing experience without losing context.

## What Changes

- Rename the `(protected)` route group to `(tabs)` to reflect its actual responsibility (tab navigation layout, not auth enforcement)
- Add a `@modal` parallel slot to the `(tabs)` layout that intercepts navigation to edit routes and renders them as Dialogs
- Create top-level `app/team/` routes for the full-page (maximized) versions of each edit page, which render without the bottom navigation bar
- Implement modal maximize: a button in the Dialog header lets users expand to the full-page version; sessionStorage preserves form state across the modal→full-page transition
- Migrate all team/player forms from raw `useState` to React Hook Form (RHF) with `zodResolver` for consistent error handling across the codebase
- Add `useFormDraft` hook (RHF + sessionStorage) for automatic draft persistence on all edit forms
- Replace the unused `use-on-leave-page.js` with a typed `useLeavePageWarning(isDirty)` hook that fires `beforeunload` protection when the form is dirty; Dialog close buttons show a shadcn AlertDialog confirmation when the form is dirty

## Capabilities

### New Capabilities

- `contextual-edit-pages`: Modal-first edit page pattern using Next.js intercepting routes and parallel slots. Edit routes open as Dialogs within the tab context and can be maximized to full-page routes outside the tab layout.
- `form-draft-persistence`: sessionStorage-backed form draft persistence via `useFormDraft` hook, enabling state recovery across modal→full-page transitions and accidental navigation.

### Modified Capabilities

- `tab-navigation`: The `(protected)` route group is renamed to `(tabs)`. The layout gains a `@modal` parallel slot for intercepted edit routes. Existing tab behavior (DOM persistence, scroll restoration, animations) is unchanged.

## Impact

- Affected specs: `contextual-edit-pages` (new), `form-draft-persistence` (new), `tab-navigation` (modified)
- Affected code:
  - New:
    - `src/app/(tabs)/` (directory rename from `src/app/(protected)/`, all existing files moved)
    - `src/app/(tabs)/@modal/default.tsx`
    - `src/app/(tabs)/@modal/(...)team/new/page.tsx`
    - `src/app/(tabs)/@modal/(...)team/[teamId]/edit/page.tsx`
    - `src/app/(tabs)/@modal/(...)team/[teamId]/lineup/page.tsx`
    - `src/app/(tabs)/@modal/(...)team/[teamId]/players/new/page.tsx`
    - `src/app/(tabs)/@modal/(...)team/[teamId]/players/[playerId]/edit/page.tsx`
    - `src/app/team/new/page.tsx`
    - `src/app/team/[teamId]/layout.tsx`
    - `src/app/team/[teamId]/edit/page.tsx`
    - `src/app/team/[teamId]/lineup/page.tsx`
    - `src/app/team/[teamId]/players/new/page.tsx`
    - `src/app/team/[teamId]/players/[playerId]/edit/page.tsx`
    - `src/hooks/use-form-draft.ts`
    - `src/hooks/use-leave-page-warning.ts`
    - `src/components/team/form.tsx` (extracted from inline page; RHF-based)
  - Modified:
    - `src/app/(tabs)/layout.tsx` (add `modal` slot prop; wrap TabContainer with modal render)
    - `src/components/layout/tab-container.tsx` (accept and render `modal` slot)
    - `src/components/team/players/create-form.tsx` (migrate to RHF)
    - `src/components/team/players/edit-form.tsx` (migrate to RHF)
  - Removed:
    - `src/hooks/use-on-leave-page.js` (dead code; replaced by `use-leave-page-warning.ts`)
    - `src/app/(protected)/` (entire directory; renamed to `(tabs)`)
