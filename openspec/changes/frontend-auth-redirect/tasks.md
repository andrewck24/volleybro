## 1. Utility: handle401Redirect

- [x] 1.1 Add `handle401Redirect(router: AppRouterInstance, toast: ToastFn): void` to `src/lib/api/error-toast.ts`. It SHALL show a destructive toast `{ title: "登入已逾期", description: "請重新登入" }` and call `router.push('/auth/sign-in')` in the same synchronous block. Export the function alongside `showErrorToast`. (Covers: Frontend 401 authentication gate)
- [x] 1.2 In `showErrorToast` in `src/lib/api/error-toast.ts`, add an early-return guard: if `error instanceof ApiClientError && error.status === 401`, return without showing a toast. This prevents double-toasting. (Covers: Frontend 401 authentication gate, Mutation catch path receives 401)

## 2. apiClient event + SWRProvider listener

- [x] 2.1 In `src/lib/api/api-client.ts`, in the non-OK response path, before throwing `ApiClientError`, add: `if (res.status === 401 && typeof window !== 'undefined') { window.dispatchEvent(new CustomEvent('api:unauthorized')); }`. The throw SHALL still execute immediately after. (Covers: Frontend 401 authentication gate, Mutation catch path receives 401)
- [x] 2.2 In `src/components/layout/swr-provider.tsx`, add a `useEffect` that registers a `window` event listener for `'api:unauthorized'`. The listener SHALL call `handle401Redirect(router, toast)`. The effect cleanup SHALL call `window.removeEventListener`. The existing `SWRConfig` `onError` SHALL be simplified to call `showErrorToast(error, toast)` only — the 401 early-return in `showErrorToast` prevents double-toasting. (Covers: Frontend 401 authentication gate, SWR GET receives 401)

## 3. SWRProvider mount (already complete)

- [x] [P] 3.1 Create `src/components/layout/swr-provider.tsx` as a `"use client"` component. (Covers: Frontend 401 authentication gate, SWR GET receives 401)
- [x] [P] 3.2 In `src/app/layout.tsx`, mount `<SWRProvider>` wrapping `<ReduxProvider>` in the root layout. (Covers: Frontend 401 authentication gate, Landing and public pages unaffected)

## 4. Spec update

- [x] [P] 4.1 Merge the delta spec at `openspec/changes/frontend-auth-redirect/specs/error-handling/spec.md` into `openspec/specs/error-handling/spec.md` by replacing the existing "API client and frontend error consumption" requirement with the updated version and appending the new "Frontend 401 authentication gate" requirement. (Covers: Frontend 401 authentication gate, API client and frontend error consumption)
