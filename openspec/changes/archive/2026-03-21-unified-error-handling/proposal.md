## Why

Error handling is fragmented across the codebase: ~50 throw points use generic `new Error("message")`, API routes detect error types via string matching (`message.includes("not found")`), and two parallel error systems (`AppError` in `src/applications/errors/` and `ApiError` in `src/lib/errors/`) both exist but are mostly unused. The pilot error pattern from the player-invitations change (Result type + AppError) was intentionally scoped to two use cases — this change completes the migration across all layers.

## What Changes

- **BREAKING**: Redefine `AppError` hierarchy — move from `src/applications/errors/` to `src/entities/errors/`, add `AuthenticationError` (401), `UnexpectedError` (500), and new fields (`reason`, `detail`, `httpStatus`). Remove `Result<T>` as the default error handling pattern (keep type definition for edge cases).
- **BREAKING**: All use cases switch from `throw new Error()` to `throw <AppError subclass>`. Callers relying on error message strings will break.
- **BREAKING**: API error response format changes from `{ error: string }` to `{ code, reason, detail, details? }`.
- Add `withErrorHandler` global error handler wrapper for API routes — catches `AppError` for structured responses, wraps unknown errors as `UnexpectedError` (500) with no internal detail leakage.
- Add `withAuth` wrapper combining session validation + error handling, eliminating copy-pasted session checks across 8+ routes.
- Extend `proxy.ts` to return 401 JSON for unauthenticated API requests (optimistic check, Edge Runtime).
- Infrastructure layer (repositories, auth services) translates raw DB/external errors into `AppError` subclasses — no raw errors penetrate to application layer.
- Add domain-scoped reason enums (`PlayerReason`, `RecordReason`, `ProfileReason`, `AuthReason`, `CommonReason`) for type-safe frontend error discrimination.
- Delete legacy `src/lib/errors/` system (`ApiError`, `handleApiError`, `withErrorHandler` — replaced by new implementation).
- Update frontend `FetchError` handling to consume `code` + `reason` from structured error responses.
- Improve frontend 500 error UX — replace plain text error messages with branded, empathetic error UI including: empathy-driven heading, brief plain-language explanation, call-to-action (retry/go home), and contact channel. Tone: witty & branded (volleyball-themed humor) to soften negative experience.
- Differentiate error presentation by severity — high-stakes irreversible mutations (remove member, transfer ownership, leave team, accept invitation) surface errors persistently within their existing AlertDialog flow so users cannot miss that the action failed; minor/recoverable operations continue using `showErrorToast`. Match recording operations use `showErrorToast` as an interim solution; a future change will introduce optimistic UI with ambient sync indicators for the recording flow.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `error-handling`: Full rewrite — replace pilot-scope Result pattern and 5-class hierarchy with throw-based pattern, 7 error classes with required reason/detail fields, `withErrorHandler`/`withAuth` route wrappers, infrastructure error translation, structured logging, and proxy authentication gate

## Impact

- Affected specs: `error-handling` (rewrite)
- Affected code:
  - Domain: `src/entities/errors/` (new location for error definitions)
  - Application: All use cases in `src/applications/usecases/` (~15 files)
  - Infrastructure: `src/infrastructure/services/auth/` (2 files), `src/infrastructure/db/repositories/` (4+ files)
  - Interface: All controllers in `src/interface/controllers/` (~5 files)
  - Routes: All API routes in `src/app/api/` (~10 files)
  - Proxy: `src/proxy.ts`
  - Frontend: `src/hooks/use-data.ts`, error-handling components
  - Presentation: `src/components/team/players/membership-section.tsx`, `src/components/team/info/index.tsx`, `src/components/team/invitation-list.tsx`, `src/components/user/invitations/index.tsx` (AlertDialog error state)
  - Deleted: `src/lib/errors/` (entire directory), `src/applications/errors/` (moved to entities)
