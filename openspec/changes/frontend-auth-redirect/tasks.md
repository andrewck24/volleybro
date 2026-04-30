## 1. Utility: handle401Redirect

- [x] 1.1 Add `handle401Redirect(router: AppRouterInstance, toast: ToastFn): void` to `src/lib/api/error-toast.ts`. It SHALL show a destructive toast `{ title: "登入已逾期", description: "請重新登入" }` and call `router.push('/auth/sign-in')` in the same synchronous block. Export the function alongside `showErrorToast`. (Covers: Frontend 401 authentication gate)
- [x] 1.2 In `showErrorToast` in `src/lib/api/error-toast.ts`, add an early-return guard: if `error instanceof ApiClientError && error.status === 401`, return without showing a toast. This prevents double-toasting when callers call `handle401Redirect` first. (Covers: Frontend 401 authentication gate, Mutation catch path receives 401)

## 2. SWRProvider component

- [x] [P] 2.1 Create `src/components/layout/swr-provider.tsx` as a `"use client"` component. It SHALL call `useRouter()` and `useToast()`, construct an `onError` callback that calls `handle401Redirect` when `error instanceof ApiClientError && error.status === 401` and `showErrorToast(error, toast)` for all other errors, then render `<SWRConfig value={{ onError }}>{children}</SWRConfig>`. (Covers: Frontend 401 authentication gate, SWR GET receives 401)
- [x] [P] 2.2 In `src/app/layout.tsx`, import `SWRProvider` and wrap the existing `<ReduxProvider>` subtree so that `<SWRProvider>` is the outermost client boundary. Verify the component tree order is: `<SWRProvider><ReduxProvider>...<ThemeProvider>...</ThemeProvider></ReduxProvider></SWRProvider>`. (Covers: Frontend 401 authentication gate, Landing and public pages unaffected)

## 3. Mutation catch path audit

- [ ] 3.1 In each of the following components, add `if (error instanceof ApiClientError && error.status === 401) { handle401Redirect(router, toast); return; }` before the existing `showErrorToast(error, toast)` call. Components to update: `src/components/home/index.tsx`, `src/components/user/invitations/index.tsx`, `src/components/game/panel/moves/oppo.tsx`, `src/components/game/panel/substitutes/index.tsx`, `src/components/game/set-options/panel/options.tsx`, `src/components/game/new/index.tsx`. Each component already imports `useToast` and calls `showErrorToast`; add `useRouter` import and `handle401Redirect` import as needed. (Covers: Mutation catch path receives 401, Non-401 error passes through unchanged)
- [ ] 3.2 Apply the same mutation catch update to: `src/components/team/index.tsx`, `src/components/team/players/create-form.tsx`, `src/components/team/players/membership-section.tsx`, `src/components/team/players/edit-form.tsx`, `src/components/team/lineup/index.tsx`. (Covers: Mutation catch path receives 401)

## 4. Spec update

- [ ] [P] 4.1 Merge the delta spec at `openspec/changes/frontend-auth-redirect/specs/error-handling/spec.md` into `openspec/specs/error-handling/spec.md` by replacing the existing "API client and frontend error consumption" requirement with the updated version and appending the new "Frontend 401 authentication gate" requirement. (Covers: Frontend 401 authentication gate, API client and frontend error consumption)
