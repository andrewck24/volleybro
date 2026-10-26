---
"volleybro": patch
---

### Changed

#### Infrastructure

- The production release now writes its recovery receipt in a separate job from the candidate's compatibility tests, so candidate code never runs next to the trusted controller; the receipt job is named `Record release recovery receipt`.
- The Vercel token reaches only the hotfix authorization job, not the authorization of normal and retry releases.
