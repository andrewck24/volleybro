## 1. Route Group Rename

- [x] 1.1 Rename `src/app/(protected)/` to `src/app/(tabs)/` using `git mv` to preserve history; route group names do not appear in import paths so no import changes are expected; satisfies "route group renamed from (protected) to (tabs)"
- [x] 1.2 Run pnpm typecheck and pnpm lint to confirm no broken references after rename; commit rename

## 2. Foundation Hooks

- [x] 2.1 [P] Write tests for `useFormDraft` in `src/hooks/__tests__/use-form-draft.test.ts`: verify draft is restored from sessionStorage on mount when key exists; verify `clearDraft` removes the key; verify `form.watch` writes to sessionStorage on value change; key format `draft:{type}:{id}` per spec examples
- [x] 2.2 [P] Implement `src/hooks/use-form-draft.ts`: wrap `useForm<T>` (React Hook Form) to read `sessionStorage.getItem(key)` and parse as `defaultValues` if present; subscribe via `form.watch` to write values to sessionStorage on every change; return `{ form, clearDraft }` where `clearDraft` calls `sessionStorage.removeItem(key)`; satisfies "useFormDraft hook: RHF + sessionStorage", "draft restored on form mount", "draft automatically saved on form value change", "draft automatically expires with sessionStorage lifecycle"
- [x] 2.3 [P] Write tests for `useLeavePageWarning` in `src/hooks/__tests__/use-leave-page-warning.test.ts`: verify `beforeunload` listener is added when `isDirty` is true; verify listener is removed when `isDirty` becomes false; verify no listener when `isDirty` is false on initial mount
- [x] 2.4 [P] Implement `src/hooks/use-leave-page-warning.ts`: accept `isDirty: boolean`; in `useEffect` keyed on `isDirty`, add `beforeunload` handler that calls `e.preventDefault()` when `isDirty`, remove it on cleanup; satisfies "useLeavePageWarning: beforeunload only"
- [x] 2.5 Delete `src/hooks/use-on-leave-page.js` (dead code — never imported anywhere in the codebase; replaced by `use-leave-page-warning.ts`)
- [x] 2.6 Commit section 2 after pnpm test, pnpm lint, pnpm typecheck, pnpm build pass

## 3. (tabs) Layout — Modal Parallel Slot

- [x] 3.1 Update `src/components/layout/tab-container.tsx`: add `modal?: React.ReactNode` to `TabContainerProps`; render `{modal}` above the tabs wrapper div so it appears as an overlay layer; existing tab behavior (DOM persistence, scroll restoration, animations) must remain unchanged; satisfies "layout renders modal parallel slot" (tab-navigation delta spec)
- [x] 3.2 Update `src/app/(tabs)/layout.tsx`: add `modal: React.ReactNode` to `ProtectedLayout` props (Next.js injects the `@modal` slot automatically); pass `modal` through to `TabContainer`; satisfies "intercepting routes with @modal parallel slot"
- [x] 3.3 Create `src/app/(tabs)/@modal/default.tsx` returning `null`; satisfies "slot default prevents 404 on hard refresh"
- [x] 3.4 Commit section 3 after pnpm test, pnpm lint, pnpm typecheck, pnpm build pass

## 4. Full-Page Edit Routes

- [x] 4.1 Create `src/app/team/[teamId]/layout.tsx`: render `<main className="flex w-full flex-col pt-[calc(env(safe-area-inset-top)+3rem)] pb-[env(safe-area-inset-bottom)]">{children}</main>`; no bottom nav, no sidenav; mirrors `src/app/game/layout.tsx` pattern; satisfies "full-page layout without bottom navigation", "full-page edit routes at app/team/ (outside (tabs))"
- [x] 4.2 [P] Create `src/app/team/new/page.tsx`: full-page team create; renders `<Header title="建立球隊" backHref="/home" />` and the RHF team create form; uses `useFormDraft("draft:team:new")` and `useLeavePageWarning(isDirty)`; satisfies "edit routes render as full-page on direct URL access" for team create
- [x] 4.3 [P] Create `src/app/team/[teamId]/edit/page.tsx`: full-page team edit; renders `<Header title="編輯球隊" backHref="/team/{teamId}" />` and RHF team edit form; uses `useFormDraft("draft:team:{teamId}")` and `useLeavePageWarning(isDirty)`; satisfies "hard navigation to team edit"
- [x] 4.4 [P] Create `src/app/team/[teamId]/lineup/page.tsx`: full-page lineup; renders `<Header title="陣容設定" backHref="/team/{teamId}" />` and the existing `<Lineup teamId={teamId} />` component; satisfies "hard navigation to lineup"
- [x] 4.5 [P] Create `src/app/team/[teamId]/players/new/page.tsx`: full-page player create; renders `<Header title="新增球員" backHref="/team/{teamId}" />` and RHF player create form; uses `useFormDraft("draft:player:new:{teamId}")`; satisfies "hard navigation to player edit" pattern
- [x] 4.6 [P] Create `src/app/team/[teamId]/players/[playerId]/edit/page.tsx`: full-page player edit; renders `<Header title="編輯球員" backHref="/team/{teamId}" />` and RHF player edit form; uses `useFormDraft("draft:player:{playerId}")`
- [x] 4.7 Commit section 4 after pnpm test, pnpm lint, pnpm typecheck, pnpm build pass

## 5. RHF Form Migration

- [ ] 5.1 Extract `src/components/team/form.tsx`: RHF-based team form component used by both create and edit pages; use `useForm({ resolver: zodResolver(TeamSchema) })` with `zodResolver`; replace manual `useState` error tracking with `<FormField>` + `<FormMessage>` from `src/components/ui/form.tsx`; accept `defaultValues?: TeamFormValues` and `onSubmit: (data: TeamFormValues) => Promise<void>` props; server errors use `form.setError("root", { message })` displayed via `<FormMessage />`; satisfies "react hook form unified across team/player forms"
- [ ] 5.2 [P] Migrate `src/components/team/players/create-form.tsx` to RHF: replace `useState(formData)` and `useState(errors)` with `useForm({ resolver: zodResolver(CreatePlayerSchema) })`; use `<FormField>` + `<FormMessage>` for inline validation errors; remove manual ZodError catch block; satisfies "draft automatically saved on form value change" when `useFormDraft` is wired in parent page
- [ ] 5.3 [P] Migrate `src/components/team/players/edit-form.tsx` to RHF: same pattern as 5.2; `InfoSection` uses `useForm` with player data as `defaultValues`; server errors use `form.setError("root", { message })`
- [ ] 5.4 Wire `clearDraft()` into each form's submit success handler: call `clearDraft()` before `router.push` or SWR `mutate` after successful API response; satisfies "draft cleared on submit success"
- [ ] 5.5 Commit section 5 after pnpm test, pnpm lint, pnpm typecheck, pnpm build pass

## 6. Dialog Intercepting Routes

- [ ] 6.1 Create `src/components/team/edit-dialog-shell.tsx`: reusable Dialog shell component (dialog as the modal component (not sheet) — works as bottom sheet on mobile and centered modal on desktop); `DialogHeader` contains: page title, a maximize icon button that calls `router.push(fullPageHref)` (Gmail-style maximize using shared sessionStorage key), and a close icon button that checks `isDirty` — if true, shows shadcn `AlertDialog` with discard confirmation (on confirm: `clearDraft()` then `router.back()`, satisfies "draft cleared on explicit discard"; on cancel: keep Dialog open); if `isDirty` is false, closes immediately; props: `title`, `fullPageHref`, `isDirty`, `clearDraft`, `children`; satisfies "dialog contains maximize affordance", "dialog close with dirty form shows confirmation", "close clean dialog — no confirmation"
- [ ] 6.2 [P] Create `src/app/(tabs)/@modal/(...)team/new/page.tsx`: wraps team create form in `EditDialogShell`; uses same `useFormDraft("draft:team:new")` key as full-page version so maximize restores state; satisfies "edit routes open as Dialog on soft navigation" for team create
- [ ] 6.3 [P] Create `src/app/(tabs)/@modal/(...)team/[teamId]/edit/page.tsx`: Dialog version of team edit; satisfies "navigate to team edit from within tab context"
- [ ] 6.4 [P] Create `src/app/(tabs)/@modal/(...)team/[teamId]/lineup/page.tsx`: Dialog version of lineup; satisfies "navigate to lineup from within tab context"
- [ ] 6.5 [P] Create `src/app/(tabs)/@modal/(...)team/[teamId]/players/new/page.tsx`: Dialog version of player create; satisfies "navigate to player create from within tab context"
- [ ] 6.6 [P] Create `src/app/(tabs)/@modal/(...)team/[teamId]/players/[playerId]/edit/page.tsx`: Dialog version of player edit; satisfies "navigate to player edit from within tab context"
- [ ] 6.7 Commit section 6 after pnpm test, pnpm lint, pnpm typecheck, pnpm build pass

## 7. Cleanup and Final Verification

- [ ] 7.1 Remove stale parallel route files from the old `(tabs)/@team` structure: `src/app/(tabs)/@team/team/[teamId]/edit/`, `src/app/(tabs)/@team/team/[teamId]/lineup/`, `src/app/(tabs)/@team/team/[teamId]/players/new/`, `src/app/(tabs)/@team/team/[teamId]/players/[playerId]/edit/`, `src/app/(tabs)/@team/team/new/`; these are now served by intercepting routes and full-page routes
- [ ] 7.2 Run pnpm test, pnpm lint, pnpm typecheck, pnpm build; fix any remaining issues
- [ ] 7.3 Manual verification: (a) hard refresh `/team/{teamId}/edit` → full-page, no bottom nav; (b) soft nav from team tab → Dialog renders; (c) fill Dialog form → click maximize → full-page opens with state restored from sessionStorage; (d) dirty Dialog close → AlertDialog appears; (e) submit form → draft cleared; (f) hard refresh with no active modal → no Dialog appears, @modal renders null
- [ ] 7.4 Review whether `docs/testing-strategy.md`, `docs/maintenance-policy.md`, or `CLAUDE.md` need updating based on route group rename or new hook patterns; update if needed
- [ ] 7.5 Commit section 7
