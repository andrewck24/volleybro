## ADDED Requirements

### Requirement: Mark glyph geometry

The VolleyBro "V" mark SHALL be the lowercase `v` glyph of the variable Saira Stencil font family (width axis pinned at 100) at the brand-selected weight, uniformly scaled so its height equals the wordmark's capital-letter height, and SHALL consist of exactly two filled sub-paths (a left arm and a notched right arm) with no other shapes.

#### Scenario: Standalone symbol footprint

- **WHEN** the standalone logo-symbol is rendered
- **THEN** the glyph SHALL be centered in a square canvas
- **AND** the glyph's width-to-height aspect ratio SHALL be that of the font's lowercase `v` at the brand weight (524:510 in font units at wght 700)

#### Scenario: Wordmark alignment

- **WHEN** the full VolleyBro wordmark (logo-type) is rendered
- **THEN** the `v` mark SHALL span exactly from the letters' baseline to their cap height
- **AND** the `olleyBro` letter shapes SHALL be unchanged from the previous wordmark, preserving the previous optical gap between mark and letters

### Requirement: Two-arm color contract

The mark's right arm SHALL always be filled with the fixed coral `#FC7A56`, in every theme and on every surface. The neutral parts (left arm, and the wordmark letters) SHALL follow the surface: theme foreground (`currentColor`) in adaptive contexts, fixed ivory `#F6F4F5` on the teal brand ground.

#### Scenario: Adaptive variant follows the theme

- **WHEN** the mark is rendered in app UI with the adaptive variant
- **THEN** the neutral parts SHALL render in the current theme foreground color
- **AND** the right arm SHALL remain `#FC7A56`

#### Scenario: Brand variant on teal ground

- **WHEN** the mark is rendered on the teal brand ground (app icons, splash screens)
- **THEN** the neutral parts SHALL be `#F6F4F5`
- **AND** the right arm SHALL remain `#FC7A56`

### Requirement: Single source of truth for geometry

The mark's path data and viewBox SHALL be defined once as exported constants in the brand components module, and every in-app consumer of the mark geometry (components, splash generation) SHALL import those constants rather than re-declaring path or viewBox literals.

#### Scenario: Splash route consumes shared constants

- **WHEN** the apple-splash route renders the mark
- **THEN** its SVG paths and viewBox SHALL come from the brand components module's exported constants
- **AND** the route source SHALL NOT contain its own viewBox or path literals for the mark

### Requirement: Raster icons derive from the mark

Every raster icon asset served from the public directory (favicon, PWA icons, Apple touch icons, maskable icons) SHALL be generated from the current mark geometry by a committed script, so a mark change is propagated by re-running the script rather than hand-exporting images.

#### Scenario: Regeneration is reproducible

- **WHEN** the icon generation script is executed on a clean checkout
- **THEN** it SHALL rewrite all raster icon files from the brand SVG geometry
- **AND** every icon file referenced by the web app manifest and the app layout SHALL exist afterwards
