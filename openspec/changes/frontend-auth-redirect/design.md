## Context

The app uses SWR for all GET data fetching and `apiClient` for mutations (POST/PATCH/DELETE). When `withAuth` returns 401 (session expired but cookie still present), `ApiClientError` with `status: 401` propagates to:
- SWR hooks → surfaced as `error` on each hook, no uniform handler
- Mutation catch blocks → delegated to `showErrorToast`, which treats 401 as an operational 4xx and shows `error.detail` in English

The `<Toaster>` lives in the root server layout (`src/app/layout.tsx`) and uses a module-level singleton state (`memoryState` in `use-toast.ts`), so toasts fired before a client-side navigation remain visible.

SWR's `onError` callback runs outside React component context, which means `useRouter()` is not directly available there.

## Goals / Non-Goals

**Goals:**
- All SWR 401 errors trigger a session-expiry toast and redirect to `/auth/sign-in`
- All mutation 401 errors trigger the same toast and redirect
- Single implementation point — no per-component 401 handling required

**Non-Goals:**
- Handling 401 on the proxy/server side (already implemented in `src/proxy.ts`)
- Retry or token-refresh logic — redirect only
- Distinguishing between cookie-absent 401 (proxy blocks before API) and session-invalid 401 (withAuth returns 401)

## Decisions

### SWRProvider as client component with useRouter

**Decision**: Create `src/components/layout/swr-provider.tsx` as a `"use client"` component. It calls `useRouter()` and `useToast()`, then passes an `onError` callback into `<SWRConfig>`.

**Why**: SWR's `onError` must close over `router` and `toast`. These are React hooks and must be called within a component. A dedicated provider component is the standard Next.js App Router pattern for sharing SWR config globally.

**Alternative rejected**: Using `window.location.href = '/auth/sign-in'` in a plain module-level config avoids the component wrapper but bypasses Next.js router (loses prefetching, scroll restoration, and transition behaviour).

### Mount SWRProvider in root layout

**Decision**: Add `<SWRProvider>` inside the existing `<ReduxProvider>` in `src/app/layout.tsx` so it covers all routes, including `/game` which is outside the `/(protected)` group.

**Why**: Both `/(protected)` and `/game` are authenticated routes. A single mount at the root eliminates duplication. Landing page routes (`/`) do not call authenticated APIs, so the `onError` handler will never fire there.

### Centralise 401 handling in a shared utility

**Decision**: Extract a `handle401Redirect(router, toast)` function into `src/lib/api/error-toast.ts`. Both `SWRProvider`'s `onError` and mutation catch paths call this utility.

**Why**: Keeps the redirect + toast logic in one place. Mutation components currently catch errors and call `showErrorToast` directly — they can call `handle401Redirect` before delegating to `showErrorToast` for non-401 errors. Update `showErrorToast` to skip 401 (since the caller will have already handled it), preventing double-toasting.

### Toast fires simultaneously with redirect, no delay

**Decision**: Call `toast(...)` and `router.push('/auth/sign-in')` in the same synchronous block with no `setTimeout`.

**Why**: The `<Toaster>` root layout component does not unmount during client-side navigation, so the toast remains visible after the route change. A delay would complicate cleanup and serves no UX purpose.

## Risks / Trade-offs

- [Risk] SWR retries on error by default — if retry fires before redirect completes, a second toast may appear → Mitigation: `showErrorToast` skips 401; SWR's retry will also 401 but `handle401Redirect` checks if already redirecting (or accept the duplicate as negligible given the redirect is immediate)
- [Risk] Components with per-route mutation catch paths may not call `handle401Redirect` → Mitigation: Covered by task — audit all mutation catch blocks and update to call `handle401Redirect` first

## Open Questions

(none)
