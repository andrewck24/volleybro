---
"volleybro": patch
---

### Changed

#### Infrastructure

- A decision record, including a new `decision` body or `supersededBy`, takes the delivery mode its size calls for; the developer still states the decision explicitly and the pull request names what it supersedes.
- Security risks for auth, session, production-gate or secrets work are settled before implementation and the diff gets its security check at the Pre-PR review; test-audit rules apply once, on the Standards axis.
- A bug fixed in passing stays within that bug, and its pull request is its Fast-path confirmation.
