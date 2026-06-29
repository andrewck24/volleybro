## Why

The current `spec-pages` (Python-generated static HTML on GitHub Pages) has persistent navigation and theming issues rooted in header.js injection and subpath URL fragility. Blueprint replaces it with a Fumadocs + Next.js site on Cloudflare Pages, which solves these at the framework level and adds a features showcase section. All existing spec-pages artifacts are migrated as the first real content, validating the new site end-to-end.

## What Changes

- New `blueprint/` Next.js + Fumadocs site at the repo root, deployable to Cloudflare Pages
- `content/changes/` directory holds spec review content (proposal, spec, review, tasks as `.mdx`; design as `.tsx`)
- `content/features/` directory holds interactive feature documentation (`.tsx` full React components)
- 13-component library (`src/components/`) covering all artifact types and feature showcase patterns
- 4 archived changes migrated into MDX/TSX format under `content/changes/archive/` (including `apple-splash-dynamic` which already has rendered HTML — used as the primary migration reference)
- CI updated: GitHub Pages workflow replaced/supplemented by Cloudflare Pages deployment
- `spec-loop/workflow.md` updated to reflect `design.html` becoming `design.tsx` (no more embed pattern)

## Capabilities

### New Capabilities

- `change-review-portal`: Browse and review Spectra change artifacts (proposal, spec, design, tasks, review) via Fumadocs-powered MDX pages with sidebar navigation and tab-based artifact switching
- `feature-showcase`: Interactive feature documentation pages built as full `.tsx` React components, using the blueprint component library (architecture diagrams, interactive flowcharts, scenario walkthroughs)
- `blueprint-component-library`: Shared React component library for both change-review and feature-showcase; 13 components covering artifact display, diagrams, and status indicators

### Modified Capabilities

(none)

## Impact

- Affected specs: `change-review-portal`, `feature-showcase`, `blueprint-component-library` (all new)
- Affected code:
  - New: `blueprint/` (entire new Next.js package at repo root)
  - New: `blueprint/src/components/` (13-component library)
  - New: `blueprint/content/changes/` (MDX artifact content, including migrated spec-pages archives)
  - New: `blueprint/content/features/` (TSX feature showcase pages)
  - New: `blueprint/.github/workflows/` or root-level CI update for Cloudflare Pages deployment
  - Removed: `docs/header.js`, `docs/index.html`, `docs/shell.html` (replaced by blueprint)
  - Removed: `.github/workflows/spec-pages.yml` (Python-based CI replaced)
