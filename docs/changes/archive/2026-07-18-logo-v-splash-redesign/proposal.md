## Why

The brand "V" mark is built from the Saira Stencil One uppercase `V` (aspect ratio 0.95 w/h), which leaves the standalone logo-symbol visibly narrower than tall and gives icon/splash placements an unbalanced footprint. The lowercase `v` of the variable **Saira Stencil** family (Google Fonts; wght 100–900, the successor to the single-weight Saira Stencil One), scaled up to cap height, is nearly square at the heavier weights (aspect 1.03 at wght 700) and keeps the identical two-arm stencil anatomy. At the same time the Android/Chrome PWA splash still shows the pre-rebrand light background (`background_color: #f2f2f6`) with a teal-square icon on it — the exact color mismatch the `apple-splash` change already eliminated on iOS (paca VB-3).

## What Changes

- Rebuild the V mark from the Saira Stencil (variable, wdth 100) lowercase `v` at the pinned brand weight wght 700 — uniformly scaled to cap height: `public/brand/logo-symbol.svg` and `public/brand/logo-type.svg` (already rebuilt on this branch), plus the React components that are the single source of truth for the glyph geometry.
- Export the mark viewBox as a shared constant so the apple-splash route stops hardcoding the old uppercase-V viewBox; the generated iOS launch screens render the new mark.
- Align the Android/Chrome auto-generated splash with iOS: set manifest `background_color` to the `--primary` brand teal and provide maskable icons so the splash reads as a bare V on teal.
- Regenerate the raster icon set (favicon, `icon-*`, `android-chrome-*`, `apple-touch-*`) from the new mark via a repeatable script.
- Add the change's blueprint design page showing the new symbol/type mockups in three variants and splash mockups.

## Capabilities

### New Capabilities

- `brand-mark`: the V mark contract — glyph source (Saira Stencil lowercase `v` at the brand weight, scaled to cap height), two-arm split with fixed coral right arm and theme-adaptive neutral parts, and a single source of truth consumed by components, icons, and both splash surfaces.
- `android-splash`: Android/Chrome PWA splash consistency via the web app manifest — brand background color and maskable/any icon assets derived from the current mark.

### Modified Capabilities

- `apple-splash`: the "V mark composition" requirement changes from a self-contained hardcoded glyph to consuming the shared brand-mark geometry (paths and viewBox), so the launch screen tracks the mark redesign.

## Impact

- Affected specs: `brand-mark` (new), `android-splash` (new), `apple-splash` (modified)
- Affected code:
  - Modified: public/brand/logo-symbol.svg, public/brand/logo-type.svg, src/components/brand/logo-symbol.tsx, src/components/brand/logo-type.tsx, src/app/apple-splash/[size]/route.tsx, public/manifest.json, blueprint/src/components/brand/logo-symbol.tsx, blueprint/src/components/brand/logo-type.tsx, blueprint/content/changes/in-progress/meta.json, blueprint/src/app/(docs)/changes/[[...slug]]/page.tsx, public/favicon.ico, public/icon-192x192.png, public/icon-256x256.png, public/icon-384x384.png, public/icon-512x512.png, public/android-chrome-192x192.png, public/android-chrome-512x512.png, public/apple-touch-icon.png, public/apple-touch-icon-76x76.png, public/apple-touch-icon-114x114.png, public/apple-touch-icon-120x120.png, public/apple-touch-icon-144x144.png, public/apple-touch-icon-152x152.png, public/apple-touch-icon-167x167.png, public/apple-touch-icon-180x180.png
  - New: scripts/generate-icons.mjs, public/maskable-icon-192x192.png, public/maskable-icon-512x512.png, blueprint/content/changes/in-progress/logo-v-splash-redesign/index.mdx, blueprint/content/changes/in-progress/logo-v-splash-redesign/design.mdx, blueprint/content/changes/in-progress/logo-v-splash-redesign/design.tsx, blueprint/content/changes/in-progress/logo-v-splash-redesign/meta.json
  - Removed: (none)
