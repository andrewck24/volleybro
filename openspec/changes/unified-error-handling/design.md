## Context

The codebase has ~50 error throw points using generic `new Error("message")`. API routes detect error types via string matching (`message.includes("not found")` → 404). Two error systems exist in parallel (`AppError` in `src/applications/errors/` and `ApiError` in `src/lib/errors/`) but neither is consistently adopted. The player-invitations change introduced a pilot-scope `AppError` hierarchy with `Result<T>` pattern, applied to only 2 use cases. This design completes the migration across all layers.

Current error flow: Use case → `throw new Error("message")` → Controller (pass-through) → Route (string-match catch block) → `NextResponse.json({ error }, { status })`.

Target error flow: Use case → `throw AppError` → Controller (pass-through) → `withErrorHandler` (automatic mapping) → structured JSON response.

## Goals / Non-Goals

**Goals:**

- Single error hierarchy used across all layers, respecting Clean Architecture dependency direction
- Every error carries structured metadata (code, reason, detail) — no string-based detection
- Centralized error-to-HTTP mapping — routes contain zero error handling boilerplate
- Infrastructure boundary enforced — no raw DB/external errors leak to application layer
- Frontend receives structured, type-safe error responses for precise UI handling
- Establish observability foundation: every error produces a structured log event with code, reason, path, and method — enabling Vercel Log Drains and future Sentry/Datadog integration without further code changes

**Non-Goals:**

- Sentry/Datadog/alerting tool integration (only prepare the logging surface)
- Full record domain clean architecture refactor (only error handling changes)
- Frontend i18n for error messages
- Rate limiting or request throttling
- Custom error pages (Next.js error.tsx boundaries)

## Decisions

### Error class hierarchy location

Error classes are defined in `src/entities/errors/` (Domain layer), not `src/applications/errors/`. This allows all layers to import errors without violating dependency direction (entities ← applications ← infrastructure). `TransientError` is also in `src/entities/errors/` despite being primarily thrown by infrastructure — it is a domain concept ("something temporarily failed") that infrastructure instantiates with specific metadata.

**Alternative considered**: Splitting errors across layers (domain errors in entities, infrastructure errors in infrastructure). Rejected because it creates two import paths and the error hierarchy needs a shared `AppError` base.

### Throw-only pattern (no Result type as default)

All use cases throw `AppError` subclasses. The `Result<T>` type definition is kept in `src/applications/types/result.ts` for the auth-hook retry logic (which needs to inspect errors without re-throwing), but it is not the standard pattern.

**Alternative considered**: Full Result pattern for all use cases. Rejected because every controller would need `if (!result.ok) throw result.error` boilerplate, and the `withErrorHandler` wrapper already provides a natural catch boundary.

### Error field structure

Each `AppError` instance carries:

- `code` (required): `AppErrorCode` enum — error classification for HTTP mapping
- `reason` (required): Domain-scoped string enum — precise discrimination (e.g., `PlayerReason.ALREADY_INVITED`)
- `detail` (required): De-identified, stable, human-readable string — safe for HTTP response and monitoring grouping
- `message` (inherited from `Error`): Internal-only, may contain entity IDs for debugging — never serialized to HTTP response
- `httpStatus` (required): Fixed per subclass — no external mapping needed
- `isTransient` (required): Boolean — retry hint for callers
- `details` (optional): Only on `ValidationError` — Zod issues array for field-level frontend errors

Constructor signature: `new ConflictError(reason, detail, internalMessage?)`. When `internalMessage` is omitted, `message` defaults to `detail`.

### Seven error subclasses

| Class                 | code             | httpStatus | isTransient |
| --------------------- | ---------------- | ---------- | ----------- |
| `ValidationError`     | `VALIDATION`     | 400        | false       |
| `AuthenticationError` | `AUTHENTICATION` | 401        | false       |
| `AuthorizationError`  | `AUTHORIZATION`  | 403        | false       |
| `NotFoundError`       | `NOT_FOUND`      | 404        | false       |
| `ConflictError`       | `CONFLICT`       | 409        | false       |
| `TransientError`      | `TRANSIENT`      | 503        | true        |
| `UnexpectedError`     | `UNEXPECTED`     | 500        | false       |

`UnexpectedError` is thrown by infrastructure when catching unclassifiable errors. The global handler also wraps any non-`AppError` into this class.

**Alternative considered**: Adding `BusinessRuleError` (422). Rejected — all current business rule violations map to `ConflictError` (state conflicts) or `ValidationError` (input constraints). YAGNI applies.

### Domain-scoped reason enums

Reason enums are grouped by domain in `src/entities/errors/reasons/`:

- `common.ts`: `CommonReason` — shared across domains (e.g., `RESOURCE_NOT_FOUND`, `INVALID_INPUT`)
- `player.ts`: `PlayerReason` — player/invitation/membership domain
- `record.ts`: `RecordReason` — match recording domain
- `profile.ts`: `ProfileReason` — user profile domain
- `auth.ts`: `AuthReason` — authentication/authorization domain

Reason values are `UPPER_SNAKE_CASE` strings. Each enum value is used by exactly one error subclass type in practice, but the type system does not enforce this coupling (reason is typed as `string` on the base class).

### `withErrorHandler` and `withAuth` wrappers

Two composable wrappers for API routes, defined in `src/app/api/_lib/wrappers.ts` (co-located with routes — they import `NextRequest`/`NextResponse` and `auth`, which are HTTP-specific concerns, not domain/application layer code).

**Execution location**: These wrappers execute at the **Route Handler layer** (Next.js App Router). They wrap the exported `GET`/`POST`/`PATCH`/`DELETE` functions in each `route.ts` file. They run in the **Node.js runtime** (not Edge), after the proxy has already performed the optimistic auth check. Controllers do not catch errors — errors bubble up naturally to the wrapper's catch boundary.

**`withErrorHandler(handler)`**: The innermost wrapper. Calls the handler inside a try/catch. On `AppError`: serializes to structured JSON `{ code, reason, detail, details? }` with `error.httpStatus`. On `ZodError`: converts to `ValidationError` with Zod issues as `details`. On any other error: wraps as `UnexpectedError`, responds with 500 and generic message. Emits a structured log event for every caught error.

**`withAuth(handler)`**: Extends `withErrorHandler`. Validates session via Better Auth `auth.api.getSession()`, resolves `userId`, passes it to handler via context object. Throws `AuthenticationError` if session is invalid, which the outer `withErrorHandler` catches and serializes.

**Execution order**: Request → Proxy (Edge) → `withAuth` (validate session) → handler (controller → use case) → `withErrorHandler` catch boundary → Response.

### Proxy authentication gate

`src/proxy.ts` is extended to return `401` JSON for unauthenticated API requests (except `/api/auth/*` routes). This runs in Edge Runtime with no DB access — it performs an optimistic cookie-existence check only. The `withAuth` wrapper in Node Runtime performs the definitive session validation.

### Infrastructure error translation

Repository implementations (`*.mongo.ts`) catch Mongoose-specific errors and translate them:

- `CastError` / document not found → `NotFoundError`
- `MongoServerError` code 11000 (duplicate key) → `ConflictError`
- Connection/timeout errors → `TransientError` with `source: "database"` metadata
- Unknown errors → `UnexpectedError` wrapping the original

Auth services (`AuthenticationService`, `AuthorizationService`) translate their specific failures:

- Invalid/missing session → `AuthenticationError`
- Insufficient role → `AuthorizationError`
- Player not in team → `AuthorizationError`

### HTTP error response format

No envelope. Success responses return entity directly (unchanged). Error responses:

```json
{
  "code": "CONFLICT",
  "reason": "ALREADY_INVITED",
  "detail": "This player already has a pending invitation",
  "details": null
}
```

`details` is only populated for `VALIDATION` errors (Zod issues). For `UNEXPECTED` errors, the response is always `{ code: "UNEXPECTED", reason: "UNHANDLED_ERROR", detail: "An unexpected error occurred" }` — no internal information leaks.

### Frontend error consumption

The existing `FetchError` class in `src/hooks/use-data.ts` already captures `status` and `info` (parsed JSON). The `info` field will now contain the structured `{ code, reason, detail }` object. Components can switch on `error.info.code` and `error.info.reason` for precise error handling. No new frontend error classes are needed.

### Observability impact and structured logging

**Current state**: Routes use `console.log("[TAG]", error)` which is stripped in production by `next.config.js` (`removeConsole: true` targets `console.log` only). This means zero error visibility in production.

**After this change**: `withErrorHandler` emits structured JSON via `console.error()` (not stripped). Every error produces a log event with `level`, `code`, `reason`, `message` (internal, with IDs), `path`, `method`, and `timestamp`.

| Capability                  | Before                            | After                                     |
| --------------------------- | --------------------------------- | ----------------------------------------- |
| Production error visibility | None (`console.log` stripped)     | All errors logged via `console.error`     |
| Error classification        | Manual string inspection          | Structured `code` + `reason`, filterable  |
| Monitoring grouping         | Impossible (messages contain IDs) | `detail` field is stable/de-identified    |
| Vercel Log Drains           | No structured data to drain       | JSON logs ready for external ingestion    |
| Future Sentry integration   | Requires rewriting error handling | Single change point in `withErrorHandler` |
| Alert rules                 | Not possible                      | Filter on `level: "error"` + `code`       |

### Migration strategy

Migration is performed domain-by-domain to keep diffs reviewable:

1. Foundation: Error classes, reason enums, wrappers (`withErrorHandler`, `withAuth`)
2. Infrastructure: Repository error translation, auth service error translation
3. Per-domain use case migration: Player → User/Profile → Team → Record
4. Route migration: Replace manual catch blocks with wrappers
5. Cleanup: Delete legacy `src/lib/errors/`, `src/applications/errors/`, update imports
6. Frontend: Update error handling in components/hooks

Each group must pass `npm test && npm run lint && npm run build` before proceeding.

### Frontend 500 error UX

Current frontend error handling displays plain text messages (e.g., `"發生錯誤"`) via toast notifications for all error types. For 500/unexpected errors, this provides no actionable guidance. The core principle is: **never interrupt the user's flow** — handle errors in-place.

**Error surface strategy by context:**

| Context | Treatment | Example |
| :--- | :--- | :--- |
| **Data loading** (SWR/list/component data) | Inline error state within the component that failed to load | Component shows branded error message with retry button in-place |
| **Form submission / match recording** | Dialog or toast with retry guidance | 「系統暫時無法處理，請稍後再試」with retry CTA |
| **Other user flows** | Toast notification with empathetic message | Non-blocking toast, user stays on current page |

**Tone**: Witty & branded (volleyball-themed humor) — e.g., 「哎呀！球掉了...」to soften frustration while keeping it actionable.

**Error message structure** (all 500-class surfaces should include):

1. **Empathy heading** — acknowledge without blame
2. **Brief explanation** — plain-language zh-TW status
3. **Action** — retry button, or guidance to try again later

**What this is NOT**:

- NOT a dedicated error page or redirect — user stays on current page
- NOT a Next.js `error.tsx` boundary — those catch render errors, while most 500s come from data fetching or mutations where the component is still mounted
- NOT changing operational error handling (400/401/403/404/409) — those remain as toast with `error.detail`

**Scope**: `ApiClientError` with `status >= 500` or `code === "UNEXPECTED"`. Reusable inline error component for data loading; dialog/toast patterns for mutations.

### Error presentation by mutation severity

An audit of all 17 `showErrorToast` call sites (smoke test 13.5) revealed that a single toast-based pattern is insufficient for all mutation contexts. Error presentation is now differentiated by severity:

**Low-stakes / recoverable** → `showErrorToast` (toast). Covers: create player, edit player info, send/cancel invitation, update role, save lineup, reject invitation.

**High-stakes / irreversible discrete actions** → Persistent error within existing AlertDialog flow. Covers:

| Component | Action | AlertDialog exists? | Change needed |
| :--- | :--- | :--- | :--- |
| `membership-section.tsx` | Remove member | Yes (確認移除) | Show error in dialog instead of toast |
| `membership-section.tsx` | Transfer ownership | Yes (確認移轉) | Show error in dialog instead of toast |
| `team/info/index.tsx` | Leave team | Yes (確認離開) | Show error in dialog instead of toast |
| `invitation-list.tsx` | Accept invitation | No | Add error state feedback (not just toast) |
| `user/invitations/index.tsx` | Accept invitation | No | Add error state feedback (not just toast) |

The pattern: when an API call fails inside an AlertDialog's confirm handler, keep the dialog open and display the error inline (e.g., red text + retry button inside the dialog footer) instead of closing the dialog and showing a toast.

**Real-time recording mutations** → `showErrorToast` as interim solution. A separate future change will introduce optimistic UI with ambient sync status indicators (Google Docs "Saving..." pattern) and inline error markers per rally/substitution. This is deferred because it requires local-first state architecture (Redux/IndexedDB), background sync queue, and conflict resolution for sequential recording dependencies (rotation order, serve rights).

## Risks / Trade-offs

- **[Large blast radius]** → Mitigated by domain-by-domain migration with build verification at each step. Use cases that haven't been migrated yet will still throw generic `Error`, which `withErrorHandler` catches as `UnexpectedError` (500) — safe but imprecise until migrated.
- **[Test churn]** → Existing tests assert on `throw new Error("message")`. All must be updated to assert on specific `AppError` subclasses. This is significant but mechanical.
- **[Frontend breaking change]** → Error response shape changes from `{ error: string }` to `{ code, reason, detail }`. Frontend components checking `data.error` will need updating. Mitigated by updating all frontend error consumers in a single group.
- **[Auth hook Result dependency]** → `src/lib/auth-hook.ts` currently uses `Result<T>` from `CreateProfileUseCase` and `LinkPendingInvitationsUseCase`. These two use cases will switch to throw, requiring the auth hook to use try/catch instead. The `Result<T>` type is kept but not used as default.
- **[Observability gap during migration]** → During migration, unmigrated use cases still throw generic `Error`. These will appear as `UNEXPECTED` (500) in logs, even if they are operational errors. This is temporary and resolves as each domain is migrated.
