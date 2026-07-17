---
"volleybro": patch
---

### Changed

#### PWA

- Serve the service worker from `/serwist/sw.js`; existing installs pick up the new worker automatically on their next online visit
- Cache navigation page shells on first visit instead of at install time, so a freshly installed app reaches a page offline only after visiting it online once
