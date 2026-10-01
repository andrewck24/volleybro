---
"volleybro": minor
---

feat(release): separate integration from guarded production release

- Prepare main-based integration without automatically deploying each merge to production.
- Authorize a fixed release revision through the trusted Changesets version PR, with candidate QA and production smoke before success-only tagging.
- Keep production promotion and compatible rollback serialized, and reject stale candidates or tags pointing at another revision.
