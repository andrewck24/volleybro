## 1. Parallel Routes layout structure

- [x] 1.1 Set up parallel routes as the tab container: create `src/app/(protected)/@home/` slot directory and move `home/page.tsx` into it; add `default.tsx` for each slot segment returning null
- [x] 1.2 Create `src/app/(protected)/@notifications/` slot with `default.tsx` for each slot segment; move `notifications/page.tsx` into it
- [x] 1.3 Create `src/app/(protected)/@user/` slot with `default.tsx` for each slot segment; move `user/page.tsx` and `user/invitations/` into it
- [x] 1.4 Create `src/app/(protected)/@team/` slot with `default.tsx` for each slot segment; move `team/page.tsx`, `team/[teamId]/`, and all nested routes into it
- [x] 1.5 Add slot default fallback: verify every route segment directory inside each slot has a `default.tsx` returning null; add any missing ones
- [x] 1.6 Rewrite `src/app/(protected)/layout.tsx` as a server component accepting all four slot props and passing them to a client tab container

## 2. Tab container client component

- [x] 2.1 Create `src/components/layout/tab-container.tsx`: apply CSS visibility toggle for active tab — render all four slots simultaneously with `display: block` / `display: none` (Tailwind `block` / `hidden`) based on `activeTab` state
- [x] 2.2 Implement per-tab current route tracking with URL as single source of truth: `tabCurrentRoute` stored as `useRef` (not `useState`) to avoid re-renders; call `usePathname()` once; implement `resolveTabFromPath(pathname): Tab`; in `useEffect([pathname])` update `tabCurrentRoute.current[activeTab]` only for non-team tabs; team tab always navigates to `/team/${teamId}` (or `/team`) via `useActiveTeamId()` — do NOT track team's sub-route
- [x] 2.3 Implement `switchTab(newTab)` with `useCallback`: early-return if `newTab === activeTab`; save `scrollPositions.current[activeTab]` before switching; determine direction by index comparison, set `data-direction`, call `document.startViewTransition` (with fallback), call `router.replace(route, { scroll: false })`; after navigation, restore `scrollPositions.current[newTab]` in `useEffect([pathname])` via double-rAF to allow DOM layout to settle
- [x] 2.4 Refactor `TabContainer` layout from `flex h-dvh flex-col` + overflow to `min-h-dvh` with content offset via padding (`pt-12 pb-20 md:pb-2 md:pl-15`) to accommodate fixed `NavigationBar`; apply safe-area insets on the outer wrapper

## 3. Navigation components

- [x] 3.1 ~~Create `src/components/layout/nav/bottom-nav.tsx`~~ **Replaced**: consolidated into unified `src/components/layout/nav/index.tsx` (`NavigationBar`) — renders as floating bottom pill on mobile (`< md`) and fixed left icon-only column on desktop (`≥ md`) via responsive Tailwind classes; iOS safe area applied via `pb-[max(env(safe-area-inset-bottom),0.5rem)]`
- [x] 3.2 ~~Refactor `src/components/layout/nav/links.tsx`~~ **Replaced**: nav item definitions and `NavButton` component extracted to `src/components/layout/nav/items.tsx`; `NavButtonsLeft` and `NavButtonsRight` replace `NavLinksLeft`/`NavLinksRight`; icon-only layout (no label text rendered) for both breakpoints

## 4. Sidenav (desktop)

- [x] 4.1 ~~Create `src/components/layout/nav/side-nav.tsx`: render four tab buttons in a vertical layout; read/write `collapsed` state to `localStorage` for collapse state persistence across refresh; hide at `< md` via `hidden md:flex` (collapsible sidenav)~~ **Replaced**: unified `NavigationBar` in `src/components/layout/nav/index.tsx` handles both mobile and desktop via responsive Tailwind classes; desktop renders as a fixed left-side icon-only nav (w-16, no collapse)
- [x] 4.2 ~~Implement expand/collapse toggle in sidenav: animate width between 200px (expanded, icon + label) and 40px (collapsed, icon only) via CSS `transition-width 300ms`~~ **Removed**: collapse feature dropped in favour of a fixed-width icon-only sidenav (Threads-style desktop layout); no localStorage state needed

## 5. View transition animation CSS

- [x] 5.1 Add `view-transition-name: tab-content` to the slot container wrapper in `tab-container.tsx`
- [x] 5.2 Update global CSS in `globals.css` for tab-switch animation to match iOS UITabBarController sliding behavior — both old and new views slide simultaneously: forward transition: old view slides out to the left (`translateX(0) → translateX(-100%)`), new view slides in from the right (`translateX(100%) → translateX(0)`); backward transition: old view slides out to the right (`translateX(0) → translateX(100%)`), new view slides in from the left (`translateX(-100%) → translateX(0)`); animation duration 300ms ease; add `slide-to-left` and `slide-to-right` keyframes for the outgoing views; `slide-from-right` and `slide-from-left` already exist — reuse or update as needed; keep all rules inside `@media (width < 768px)` block; remove any opacity fade from the old view since the simultaneous slide replaces it

## 6. Per-page Header component

- [x] 6.1 Create `src/components/layout/header.tsx`: shared shell accepting `title?: string`, `backHref?: string`, `children?: ReactNode`; render back button that navigates to `backHref` if no browser history (back button fallback), otherwise calls `router.back()`; apply consistent height, padding, backdrop-blur, z-index (per-page Header)
- [x] 6.2 Update `src/app/(protected)/@home/home/page.tsx`: add `<Header title="首頁" />` and `export const metadata`
- [x] 6.3 Update `src/app/(protected)/@notifications/notifications/page.tsx`: add `<Header title="通知" />` and `export const metadata`
- [x] 6.4 Update `src/app/(protected)/@user/user/page.tsx`: add `<Header title="設定" />` and `export const metadata`; update `user/invitations/page.tsx` with `<Header title="邀請" backHref="/user" />`
- [x] 6.5 Update `src/app/(protected)/@team/team/page.tsx`: add `<Header title="球隊" />` and `export const metadata` (team-switcher deferred to lineup-overlay change)
- [x] 6.6 Update `src/app/(protected)/@team/team/[teamId]/page.tsx`: add `<Header title="球隊" />`; static metadata (team-switcher deferred)
- [x] 6.7 Update all remaining deep team pages (`players/[playerId]/page.tsx`, `players/[playerId]/edit/page.tsx`, `lineup/page.tsx`): add `<Header title="..." backHref="..."/>` and `export const metadata`

## 7. Verification

- [x] 7.1 Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` and confirm all pass
- [ ] 7.2 Manually verify tab DOM persistence: navigate to a deep route in Team tab, switch to Home tab and back, confirm Team tab returns to the same route without refetch
- [ ] 7.3 Manually verify URL synchronization on tab switch: confirm URL updates correctly on every tab switch and hard refresh restores the correct tab
- [ ] 7.4 Manually verify collapsible sidenav on desktop: toggle collapse, reload page, confirm state persists
- [ ] 7.5 Manually verify directional tab-switch animation on a supported browser; confirm instant fallback on unsupported environments
- [x] 7.6 Review whether `docs/`, `README.md`, `CONTRIBUTING.md`, `openspec/config.yaml`, and `CLAUDE.md` need updating based on the new routing structure; update if necessary
