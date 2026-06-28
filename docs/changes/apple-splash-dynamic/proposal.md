## Why

The nine Apple PWA splash images are hand-exported PNGs from April 2024 that no longer match the app's current `--primary` brand color, and every rebrand or token change forces re-exporting all nine binaries by hand. A single parametric generator removes the stored assets and makes the splash track the design tokens.

## What Changes

- Add a dynamic route that renders an Apple PWA launch screen with `next/og` `ImageResponse`: a bare, reconstructed "V" mark (white and coral SVG polygons derived from the existing icon geometry) centered on a solid `--primary` background. Width and height come from the route segment so one handler serves every device size.
- Repoint each `appleWebApp.startupImage` entry in the app root layout to the new route (carrying the exact device pixel size) instead of a static `/apple-splash/*.png` file. Each device still needs its own `media` query — Apple requires them and offers no wildcard.
- Extend coverage from the previous nine iPhone-only configs to fifteen: iPhone through the iPhone 17 generation (including iPhone Air) plus common iPad sizes. Because screens are now generated, added coverage is just new device entries — no new image assets.
- Remove the nine static PNGs under the public `apple-splash` directory.
- Note: Android/Chrome splash uses the web app manifest (a separate mechanism) and is handled by the sibling `android-splash-manifest` change, not here.

## Capabilities

### New Capabilities

- `apple-splash`: generation and registration of Apple PWA launch screens (startup images).

### Modified Capabilities

(none)

## Impact

- Affected specs: `apple-splash` (new)
- Affected code:
  - New: `src/app/apple-splash/[size]/route.tsx`
  - Modified: `src/app/layout.tsx`
  - Removed: `public/apple-splash/750x1334_2x.png`, `public/apple-splash/828x1792_2x.png`, `public/apple-splash/1080x1920_3x.png`, `public/apple-splash/1125x2436_3x.png`, `public/apple-splash/1170x2532_3x.png`, `public/apple-splash/1179x2556_3x.png`, `public/apple-splash/1242x2688_3x.png`, `public/apple-splash/1284x2778_3x.png`, `public/apple-splash/1290x2796_3x.png`
