## Why

VolleyBro is a PWA used like a native app. The current bottom navbar resets each tab's content on every switch — a poor mobile experience. Users expect tab state to persist the same way GitHub mobile and Facebook mobile work. On desktop, a collapsible sidenav replaces the bottom nav for a responsive layout appropriate to larger screens.

## What Changes

- Replace the current `<Link>`-based NavLinks with a Parallel Routes layout that keeps all tab DOMs mounted simultaneously
- Active tab shown via CSS (`display: block`), inactive tabs hidden (`display: none`) — no unmounting
- NavLinks become buttons that toggle the active tab and call `router.replace` to sync the URL
- Nav is always visible regardless of route depth — no conditional hiding
- On `≥ md` (768px+): render a collapsible sidenav (icon + label when expanded, icon-only when collapsed) instead of the bottom nav
- On `< md`: render bottom nav with `padding-bottom: env(safe-area-inset-bottom)` for iOS safe area
- Tab-switch animation using `document.startViewTransition()` with directional CSS (slide left/right based on tab order index); graceful fallback for unsupported browsers
- Each page (`page.tsx`) renders its own `<Header>` with a shared shell component for visual consistency; layout no longer owns the header
- All deep routes moved inside their respective `@<tab>` slot directories so navigating deep does not unmount other tabs
- Each route segment inside a slot provides a `default.tsx` for hard-refresh fallback

## Non-Goals

- Per-tab history stack (browser history naturally handles back navigation since all pages are reached from parent routes)
- Swipe-back gesture interception (PWA standalone mode has no browser navigation bar)
- Redux-managed routing (Next.js router is the source of truth)
- Scroll position restoration for same-tab navigations (e.g. scrolling within a page and then navigating deeper)
- SEO optimization for tab routes
- Desktop sidenav pinned/unpinned behavior (always visible, never overlay)
- Lineup page overlay presentation (deferred to `lineup-overlay` change)

## Capabilities

### New Capabilities

- `persistent-tab-navigation`: Bottom navbar (mobile) and collapsible sidenav (desktop) with per-tab DOM preservation, URL sync, directional tab-switch animation, and always-visible nav

### Modified Capabilities

(none)

## Impact

- Affected specs: `persistent-tab-navigation` (new)
- Affected code:
  - `src/app/(protected)/layout.tsx` — converted to Parallel Routes with 4 slots; breakpoint-based nav rendering
  - `src/app/(protected)/@home/` — new slot directory (moved from `home/`)
  - `src/app/(protected)/@team/` — new slot directory (moved from `team/`)
  - `src/app/(protected)/@notifications/` — new slot directory (moved from `notifications/`)
  - `src/app/(protected)/@user/` — new slot directory (moved from `user/`)
  - `src/components/layout/nav/links.tsx` — converted from `<Link>` to tab-toggle buttons with `router.replace`
  - `src/components/layout/nav/bottom-nav.tsx` — mobile bottom nav shell
  - `src/components/layout/nav/side-nav.tsx` — desktop collapsible sidenav
  - `src/components/layout/header.tsx` — new shared Header shell component
  - All `page.tsx` files within `(protected)` — add `<Header>` with page-specific content
  - `src/app/(protected)/@team/team/[teamId]/page.tsx` — Header contains team-switcher drawer (replaces `TeamList` in user menu)
  - `src/components/user/menu/index.tsx` — `TeamList` component removed; team switching moved to team tab Header
