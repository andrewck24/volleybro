## Context

The app root layout registers nine `appleWebApp.startupImage` entries, each pairing a device `media` query with a static PNG under `public/apple-splash/`. The PNGs were hand-exported in April 2024 and their background no longer matches the current `--primary` token. Next.js 16 ships `next/og` (`ImageResponse`), so launch screens can be generated at request time with no new dependency and no stored assets. The approved design comp is `mockup.html` (draft `bareV`): the reconstructed "V" mark on a `--primary` field.

## Goals / Non-Goals

**Goals:**

- Replace the nine stored splash PNGs with one parametric route that renders any device size.
- Drive the splash background from the `--primary` token so it tracks rebrands.
- Reconstruct the "V" mark as vector polygons so it does not depend on the lost original vector or on the rounded-square icon.
- Extend coverage to the iPhone 17 generation and common iPad sizes (fifteen configurations: twelve iPhone, three iPad), up from the previous nine iPhone-only; every previously covered device stays covered.

**Non-Goals:**

- Regenerating the app icon to match `--primary` (the icon teal `#0D5365` differs from `--primary` `#10687E`); tracked as a separate future change.
- iPad landscape orientation and dark-mode variants (portrait coverage for both iPhone and iPad is in scope).
- Android/Chrome splash (manifest-based, a separate mechanism); tracked as the sibling `android-splash-manifest` change.
- Precaching the generated launch screens for offline install (iOS fetches startup images online at install time).

## Decisions

### D1: Runtime generation via `next/og` `ImageResponse`

Use a Route Handler returning an `ImageResponse` rather than a build-time script. Rationale: zero new dependency (`next/og` is bundled with Next 16), no build step, no stored binaries. iOS fetches startup images at install time (online), so runtime generation is acceptable.

### D2: Size comes from the route segment, validated against a fixed list

The handler reads the target size from a single dynamic segment of the form `<width>x<height>`. A module-level list of the fifteen supported `{ width, height }` pairs (twelve iPhone, three iPad) is the source of truth. An unknown size returns 404 so unsupported requests never produce a mis-sized image (iOS ignores mis-sized startup images anyway).

### D3: "V" mark as two inline polygons, centered

The mark is two filled polygons whose points are traced from `public/icon-512x512.png` in a 512x512 coordinate space: left arm `88,98 208,98 285,405 168,405` filled `#F6F4F5`; right arm `308,98 422,98 338,405 312,392` filled `#FC7A56`. The mark is scaled to a fraction of the shorter device dimension and centered on a full-bleed `#10687E` (`--primary`) background. No `<img>`; polygons only.

### D4: The fifteen device configurations are the shared source of truth

The same fifteen `{ media, width, height }` entries drive both the layout's `startupImage` list (each `url` becomes `/apple-splash/<width>x<height>`) and the route's accepted-size validation, so coverage and the accepted sizes cannot drift apart. iPhone entries carry `-webkit-device-pixel-ratio: 2` or `3`; iPad entries carry `2`.

## Implementation Contract

- **Behavior:** Installing the PWA on a supported iPhone shows a launch screen that is the "V" mark centered on the `--primary` color, at the device's exact resolution — visually identical to the approved `mockup.html` `bareV` draft.
- **Interface:**
  - New route handler at `src/app/apple-splash/[size]/route.tsx` exporting `GET`; `[size]` is `"<width>x<height>"`. Returns an `ImageResponse` of exactly that width/height on success, `404` on an unsupported size.
  - A shared module exports the fifteen device configs (`media`, `width`, `height`) consumed by both the route and the layout.
  - `src/app/layout.tsx` builds `appleWebApp.startupImage` from that shared list, each entry `{ media, url: "/apple-splash/<width>x<height>" }`.
- **Failure modes:** Unsupported size → HTTP 404, no body image. No silent fallback to a default size.
- **Acceptance criteria:**
  - Requesting `/apple-splash/1290x2796` returns a PNG of exactly 1290x2796.
  - Requesting an unregistered size (e.g. `/apple-splash/100x100`) returns 404.
  - The rendered head contains fifteen `apple-touch-startup-image` links, none referencing `public/apple-splash/`.
  - `public/apple-splash/` contains no PNG files after the change.
  - Visual check against `mockup.html` draft `bareV`.

## Design Comp

The approved visual is `mockup.html` (draft `bareV`); `design.html` embeds it.
