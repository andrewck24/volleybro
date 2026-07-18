# android-splash Specification

## Purpose

TBD - created by archiving change 'logo-v-splash-redesign'. Update Purpose after archive.

## Requirements

### Requirement: Manifest splash background matches the brand

The web app manifest SHALL declare `background_color` equal to the `--primary` brand teal `#10687e`, so the Android/Chrome auto-generated PWA splash field matches the iOS launch screen background.

#### Scenario: Splash field color

- **WHEN** Chrome on Android launches the installed PWA
- **THEN** the auto-generated splash background SHALL be the brand teal, identical to the iOS launch screen background color

---

### Requirement: Maskable splash icon reads as a bare V

The manifest SHALL declare maskable icons at 192x192 and 512x512 whose full-bleed background is the same brand teal and whose mark sits inside the maskable safe zone, so the composed Android splash (teal field + centered icon) visually reads as a bare V on teal with no visible icon boundary.

#### Scenario: Maskable entries declared alongside any-purpose icons

- **WHEN** the manifest icons are enumerated
- **THEN** there SHALL be entries with `"purpose": "maskable"` at 192x192 and 512x512 referencing existing files
- **AND** the previously declared `purpose: any` icon entries SHALL remain

#### Scenario: No visible icon boundary on the splash

- **WHEN** the splash is composed from `background_color` and the maskable icon
- **THEN** the icon's background field SHALL be the same color value as the manifest `background_color`, leaving only the V mark visible
