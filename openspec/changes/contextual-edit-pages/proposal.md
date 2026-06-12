## Why

Edit pages (team edit, player create/edit, lineup) currently mix responsibilities between tab-context modal editing and workspace editing. The workspace experience needs a clearly named route group to reduce cognitive load and make implementation boundaries explicit.

## What Changes

- Rename the `(protected)` route group to `(tabs)` to reflect its actual responsibility (tab navigation layout, not auth enforcement)
- Add a `@modal` parallel slot to the `(tabs)` layout that intercepts navigation to edit routes and renders them as Dialogs
- Move workspace edit routes to `app/(workspace)/team/` (URL remains `/team/...`) to represent workspace mode explicitly
- Introduce shared `src/app/(workspace)/layout.tsx` (`WorkspaceLayout`) and move team edit layout responsibility there
- Apply workspace width constraint parity with tabs layout: workspace `<main>` uses `mx-auto w-full max-w-196`
- Implement modal maximize: a button in the Dialog header lets users expand to the workspace version; sessionStorage preserves form state across the modal→workspace transition
- Migrate all team/player forms from raw `useState` to React Hook Form (RHF) with `zodResolver` for consistent error handling across the codebase
- Add `useFormDraft` hook (RHF + sessionStorage) for automatic draft persistence on all edit forms
- Replace the unused `use-on-leave-page.js` with a typed `useLeavePageWarning(isDirty)` hook that fires `beforeunload` protection when the form is dirty; Dialog close buttons show a shadcn AlertDialog confirmation when the form is dirty
- Rename page-only wrappers from `*Screen` to `*Workspace` to align with route-group terminology
- Validate `teamId` route params with explicit API semantics: invalid identifier format returns `400 VALIDATION`, valid but missing resource returns `404 NOT_FOUND`
- For team-not-found in workspace mode, show page-level `Alert` with a `返回` action instead of toast-only feedback
- Update `DialogContent` `size="lg"` width constraint to `max-w-196` for modal/workspace visual consistency
- Suppress the native browser `beforeunload` "leave site" prompt when the user maximizes a dirty edit Dialog to its workspace route, since `useFormDraft` already preserves form state via sessionStorage across the transition

## Capabilities

### New Capabilities

- `contextual-edit-pages`: Modal/workspace edit page pattern using Next.js intercepting routes and parallel slots. Edit routes open as Dialogs within tab context (`modal mode`) and can be maximized to workspace routes in `(workspace)` (`workspace mode`).
- `form-draft-persistence`: sessionStorage-backed form draft persistence via `useFormDraft` hook, enabling state recovery across modal→workspace transitions and accidental navigation.

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
    - `src/app/(workspace)/team/new/page.tsx`
    - `src/app/(workspace)/layout.tsx`
    - `src/app/(workspace)/team/[teamId]/edit/page.tsx`
    - `src/app/(workspace)/team/[teamId]/lineup/page.tsx`
    - `src/app/(workspace)/team/[teamId]/players/new/page.tsx`
    - `src/app/(workspace)/team/[teamId]/players/[playerId]/edit/page.tsx`
    - `src/hooks/use-form-draft.ts`
    - `src/hooks/use-leave-page-warning.ts`
    - `src/components/team/form.tsx` (extracted from inline page; RHF-based)
  - Modified:
    - `src/app/(tabs)/layout.tsx` (add `modal` slot prop; wrap TabContainer with modal render)
    - `src/components/layout/tab-container.tsx` (accept and render `modal` slot)
    - `src/components/ui/dialog.tsx` (`size="lg"` width constraint aligned to `max-w-196`)
    - `src/components/team/players/create-form.tsx` (migrate to RHF)
    - `src/components/team/players/edit-form.tsx` (migrate to RHF)
    - `src/hooks/use-leave-page-warning.ts` (export `suppressLeaveWarning()` to bypass native `beforeunload` prompt once)
    - `src/components/layout/edit-dialog-container.tsx` (call `suppressLeaveWarning()` before hard-navigating on maximize)
  - Removed:
    - `src/hooks/use-on-leave-page.js` (dead code; replaced by `use-leave-page-warning.ts`)
    - `src/app/(protected)/` (entire directory; renamed to `(tabs)`)
