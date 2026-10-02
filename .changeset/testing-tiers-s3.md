---
"volleybro": patch
---

### Changed

#### Infrastructure

- Component and hook tests answer HTTP with MSW and run the real hooks, SWR, Redux store and child components; the team, game, layout, auth and hook tests no longer mock `apiClient`, `fetch`, SWR or their own code
- A request that no MSW handler answers now fails the test, and the shared setup no longer replaces `fetch` globally
- The testing strategy documents how a test answers HTTP, holds a request in flight and isolates the SWR cache

### Removed

#### Infrastructure

- Frontend tests that could not fail: toast-never-called assertions on components with no toast path, SWR call-count assertions and CSS-class assertions on the game overlay and sync indicator
