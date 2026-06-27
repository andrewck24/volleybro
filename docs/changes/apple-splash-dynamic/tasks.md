## 1. Shared device configuration

- [x] 1.1 Create `src/app/apple-splash/devices.ts` exporting an ordered list of the fifteen supported device configs as `{ media: string; width: number; height: number }`. Reuse the exact `media` strings and pixel sizes currently in `src/app/layout.tsx` for the nine existing iPhone sizes (750x1334, 828x1792, 1080x1920, 1125x2436, 1170x2532, 1179x2556, 1242x2688, 1284x2778, 1290x2796), then add three iPhone 17-generation sizes — 1206x2622 (device-width 402, device-height 874, dpr 3; iPhone 16 Pro / 17 / 17 Pro), 1320x2868 (440×956, dpr 3; iPhone 16 Pro Max / 17 Pro Max), 1260x2736 (420×912, dpr 3; iPhone Air) — and three iPad portrait sizes at dpr 2 — 1488x2266 (744×1133; iPad mini), 1640x2360 (820×1180; iPad Air / Pro 11"), 2048x2732 (1024×1366; iPad Pro 12.9"). Build each `media` string in the same format as the existing entries with the matching `device-width`, `device-height`, `-webkit-device-pixel-ratio`, and `orientation: portrait`. Export a helper `isSupportedSize(w, h)` that returns true only for a listed pair. → verify: `devices.ts` lists 15 entries; `isSupportedSize(1320,2868)` and `isSupportedSize(2048,2732)` true, `isSupportedSize(100,100)` false.

## 2. Launch-screen route

- [x] 2.1 Create `src/app/apple-splash/[size]/route.tsx` with a `GET` handler that parses the `[size]` segment as `"<width>x<height>"`, returns HTTP 404 when `isSupportedSize` is false, and otherwise returns a `next/og` `ImageResponse` sized to exactly that width and height. → verify: `GET /apple-splash/1290x2796` returns a 1290x2796 PNG; `GET /apple-splash/100x100` returns 404.
- [x] 2.2 In the route, render the splash as a full-bleed background of `#10687E` (the `--primary` value) with a centered inline SVG "V" using hardcoded Saira Stencil One glyph path data (extracted via opentype.js at 512px scale): left arm path filled `#F6F4F5`, right arm path filled `#FC7A56`, `viewBox="-10 225 360 360"`, sized to 25% of `Math.min(w, h)`. Set `Cache-Control: public, max-age=31536000, immutable` on the response. → verify: rendered PNG shows the V mark centered on the primary color, matching `mockup.html` draft `bareV`; response includes Cache-Control immutable.

## 3. Layout registration

- [x] 3.1 In `src/app/layout.tsx`, replace the hand-written `appleWebApp.startupImage` array by mapping the shared `devices.ts` list so each entry's `url` becomes the path `/apple-splash/<width>x<height>`. Remove the nine inline static `/apple-splash/*.png` URLs. → verify: rendered `<head>` contains 15 `apple-touch-startup-image` links, every `href` pointing at `/apple-splash/<w>x<h>` and none at `public/apple-splash/`.

## 4. Remove static assets

- [x] 4.1 Delete the nine PNG files under `public/apple-splash/` (`750x1334_2x.png`, `828x1792_2x.png`, `1080x1920_3x.png`, `1125x2436_3x.png`, `1170x2532_3x.png`, `1179x2556_3x.png`, `1242x2688_3x.png`, `1284x2778_3x.png`, `1290x2796_3x.png`). → verify: `public/apple-splash/` contains no `.png` files; grep of `src/` finds no reference to the deleted paths.

## 5. Verification

- [x] 5.1 Run `pnpm build` and load the app; confirm the 15 startup-image links resolve (each route returns its exact-size PNG) and no 404/console error references `apple-splash`. → verify: build passes; each registered `/apple-splash/<w>x<h>` returns a correctly sized PNG.
