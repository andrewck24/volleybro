---
"volleybro": minor
---

### Changed

#### Game

- Rename "Record" domain to "Game" across all routes, pages, and APIs; previous URLs under `/record/` now resolve at `/game/`

#### Infrastructure

- Replace `_id` with `id` in all domain entity types
- Rewrite repository interfaces with domain-language methods, removing generic MongoDB query filters
