---
"volleybro": patch
---

### Changed

#### Infrastructure

- Repository behaviour is proven against a real in-memory MongoDB in `test/integration/persistence/`, and the repositories' unit tests that only replayed a mocked model are gone
- Backend tests no longer replace `mongoose`, `mongodb` and `bson` with global stubs; a test that needs a fake states it itself
- Document-to-entity mapping and the player update `$set`/`$unset` split are pure functions with their own unit tests

### Removed

#### Infrastructure

- Repository methods no production code called: game and team `delete`, and player `findByEmail`, `countByTeamId` and `existsInvitation`
