---
"volleybro": patch
---

### Fixed

#### API

- Return `400 VALIDATION` when a profile update sends an `activeTeamId` that is not an ObjectId, instead of failing only when the profile is written
