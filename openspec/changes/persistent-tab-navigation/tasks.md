## 1. Parallel Routes layout structure

- [x] 1.1 Set up parallel routes as the tab container: create `src/app/(protected)/@home/` slot directory and move `home/page.tsx` into it; add `default.tsx` for each slot segment returning null
- [x] 1.2 Create `src/app/(protected)/@notifications/` slot with `default.tsx` for each slot segment; move `notifications/page.tsx` into it
- [x] 1.3 Create `src/app/(protected)/@user/` slot with `default.tsx` for each slot segment; move `user/page.tsx` and `user/invitations/` into it
- [x] 1.4 Create `src/app/(protected)/@team/` slot with `default.tsx` for each slot segment; move `team/page.tsx`, `team/[teamId]/`, and all nested routes into it
- [x] 1.5 Add slot default fallback: verify every route segment directory inside each slot has a `default.tsx` returning null; add any missing ones
- [x] 1.6 Rewrite `src/app/(protected)/layout.tsx` as a server component accepting all four slot props and passing them to a client tab container

## 2. Tab container client component

- [ ] 2.1 Create `src/components/layout/tab-container.tsx`: apply CSS visibility toggle for active tab — render all four slots simultaneously with `display: block` / `display: none` (Tailwind `block` / `hidden`) based on `activeTab` state
- [ ] 2.2 Implement per-tab current route tracking with URL as single source of truth: call `usePathname()` once in `tab-container.tsx`; implement `resolveTabFromPath(pathname): Tab`; in a `useEffect([pathname])` derive `activeTab` from pathname and update only `tabCurrentRoute[resolvedTab]` — do NOT set `activeTab` as independent state driven by `switchTab()`
- [ ] 2.3 Implement `switchTab(newTab)` using NavLinks as tab-toggle buttons with `router.replace`: determine direction by index comparison against `activeTab`, set `data-direction`, call `document.startViewTransition` (with fallback), call `router.replace(tabCurrentRoute[newTab], { scroll: false })` — `activeTab` updates automatically via the pathname `useEffect`

## 3. Bottom navigation (mobile)

- [ ] 3.1 Create `src/components/layout/nav/bottom-nav.tsx`: four tab buttons with `activeTab` and `onTabSwitch` props; apply `pb-[env(safe-area-inset-bottom)]` for iOS safe area; hide at `≥ md` via `md:hidden` (responsive navigation layout)
- [ ] 3.2 Refactor `src/components/layout/nav/links.tsx`: convert from `<Link href="...">` elements to tab-toggle buttons calling `onTabSwitch`; remove all `href` props

## 4. Sidenav (desktop)

- [ ] 4.1 Create `src/components/layout/nav/side-nav.tsx`: render four tab buttons in a vertical layout; read/write `collapsed` state to `localStorage` for collapse state persistence across refresh; hide at `< md` via `hidden md:flex` (collapsible sidenav)
- [ ] 4.2 Implement expand/collapse toggle in sidenav: animate width between 200px (expanded, icon + label) and 40px (collapsed, icon only) via CSS `transition-width 300ms`

## 5. View transition animation CSS

- [ ] 5.1 Add `view-transition-name: tab-content` to the slot container wrapper in `tab-container.tsx`
- [ ] 5.2 Add global CSS rules in `globals.css` for `[data-direction="forward"]` and `[data-direction="backward"]` targeting `::view-transition-old(tab-content)` and `::view-transition-new(tab-content)` with slide-left/slide-right keyframe animations at 300ms ease (directional tab-switch animation)

## 6. Per-page Header component

- [ ] 6.1 Create `src/components/layout/header.tsx`: shared shell accepting `title?: string`, `backHref?: string`, `children?: ReactNode`; render back button that navigates to `backHref` if no browser history (back button fallback), otherwise calls `router.back()`; apply consistent height, padding, backdrop-blur, z-index (per-page Header)
- [ ] 6.2 Update `src/app/(protected)/@home/home/page.tsx`: add `<Header title="首頁" />` and `export const metadata`
- [ ] 6.3 Update `src/app/(protected)/@notifications/notifications/page.tsx`: add `<Header title="通知" />` and `export const metadata`
- [ ] 6.4 Update `src/app/(protected)/@user/user/page.tsx`: add `<Header title="設定" />` and `export const metadata`; update `user/invitations/page.tsx` with `<Header title="邀請" backHref="/user" />`
- [ ] 6.5 Update `src/app/(protected)/@team/team/page.tsx`: add `<Header>` with team-switcher drawer trigger children; add `generateMetadata` returning team name
- [ ] 6.6 Update `src/app/(protected)/@team/team/[teamId]/page.tsx`: add `<Header>` with team-switcher drawer trigger; add `generateMetadata` returning team name
- [ ] 6.7 Update all remaining deep team pages (`players/[playerId]/page.tsx`, `players/[playerId]/edit/page.tsx`, `lineup/page.tsx`): add `<Header title="..." backHref="..."/>` and `generateMetadata` with player/page name

## 7. Verification

- [ ] 7.1 Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` and confirm all pass
- [ ] 7.2 Manually verify tab DOM persistence: navigate to a deep route in Team tab, switch to Home tab and back, confirm Team tab returns to the same route without refetch
- [ ] 7.3 Manually verify URL synchronization on tab switch: confirm URL updates correctly on every tab switch and hard refresh restores the correct tab
- [ ] 7.4 Manually verify collapsible sidenav on desktop: toggle collapse, reload page, confirm state persists
- [ ] 7.5 Manually verify directional tab-switch animation on a supported browser; confirm instant fallback on unsupported environments
- [ ] 7.6 Review whether `docs/`, `README.md`, `CONTRIBUTING.md`, `openspec/config.yaml`, and `CLAUDE.md` need updating based on the new routing structure; update if necessary
