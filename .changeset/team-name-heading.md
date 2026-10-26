---
"volleybro": patch
---

### Fixed

#### Accessibility

- The team page now announces the team name as the page heading to screen readers.

#### Infrastructure

- Production smoke finds the test team by its page heading, so it no longer fails on every release because production builds remove test markers.
