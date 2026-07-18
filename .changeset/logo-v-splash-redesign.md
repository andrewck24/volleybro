---
"volleybro": patch
---

### Changed

#### Brand

- Rebuilt the V mark from the variable Saira Stencil family's lowercase `v` (wght 700), giving the logo a near-square footprint; the wordmark keeps its letterforms with the new mark aligned to cap height
- iOS launch screens now compose the mark from the shared brand geometry and add the wordmark near the bottom
- Android/Chrome PWA splash matches iOS: manifest `background_color` is the brand teal and new maskable icons render as a bare V on the splash
- All app icons (favicon, PWA, Apple touch) regenerated from the new mark via a committed script (`pnpm generate-icons`)
