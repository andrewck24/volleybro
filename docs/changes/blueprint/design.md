## Context

The current `spec-pages` system is a Python CI script that generates static HTML from `docs/changes/` markdown files and deploys to GitHub Pages under the `/volleybro/` subpath. Navigation is provided by `docs/header.js` — a self-executing IIFE injected into each `.html` at build time. This approach has produced recurring issues:

- Absolute URL paths break under the GitHub Pages subpath (`/volleybro/`)
- `header.js` injection is error-prone and brittle across nested archive paths
- No per-branch preview URLs — every change is only visible after merge
- Design artifacts (mockups, interactive flows) are embedded as iframes from separate `mockup.html` files, adding complexity to the discuss→propose handoff
- The Python CI couples artifact rendering with deployment, making local preview impossible without running the full script

Blueprint replaces this with a Fumadocs (Next.js) site that handles navigation, theming, and routing natively — eliminating the header.js layer entirely.

## Goals / Non-Goals

**Goals:**

- Ship a working Fumadocs site at `blueprint/` deployable to Cloudflare Pages
- Change-review section: browse and read all Spectra change artifacts (proposal, spec, design, tasks, review) with Fumadocs sidebar and tab navigation
- Feature-showcase section: interactive `.tsx` pages documenting VolleyBro features
- 13-component library covering all artifact types and feature showcase patterns
- Migrate 4 archived changes as real content to validate all artifact types end-to-end; `apple-splash-dynamic` (which already has rendered `.html` files from the old spec-pages system) is migrated first and serves as the primary reference for the expected visual output
- Cloudflare Pages deployment with per-branch preview URLs
- Monorepo-ready: `blueprint/` is an independent Next.js package (own `package.json`, `tsconfig.json`) — no shared root config dependency

**Non-Goals:**

- Migrating all 23+ archived changes (only 3 representative ones for validation; full migration is a follow-up)
- Replacing the `docs/changes/` markdown workflow (Spectra still writes `.md` files; blueprint is a separate reading layer)
- Auto-syncing blueprint content with `docs/changes/` (blueprint content is manually curated; automation is a follow-up)
- Building a CMS or admin UI for content management
- Multi-project blueprint (portability to other repos) — current scope is VolleyBro; extraction to `@spectra/blueprint-ui` is post-validation
- Removing `docs/header.js` and `spec-pages.yml` until blueprint is deployed and validated (parallel operation during transition)

## Decisions

### D1: Fumadocs with file-based MDX routing

Fumadocs provides `DocsLayout` (sidebar + breadcrumb + TOC), MDX rendering, dark mode, and search out of the box. Alternative: custom Next.js with manual sidebar — requires ~600 lines of layout/navigation code. Fumadocs costs one `npm install` and minimal config.

Routing: `content/changes/[slug]/proposal.mdx`, `content/changes/[slug]/design.tsx`, etc. Fumadocs `source.getPage(slug)` handles MDX; `.tsx` design/features pages are plain Next.js dynamic routes that reuse `DocsLayout`.

### D2: MDX for text artifacts, .tsx for interactive artifacts

| Artifact | Format | Reason |
|----------|--------|--------|
| proposal, spec, review | `.mdx` | Primarily prose + component sprinkles; Fumadocs MDX pipeline handles it |
| tasks | `.mdx` | Live checklist; `<TaskProgress>` component reads frontmatter counts |
| design | `.tsx` | Full interactive React; Thariq-style flowcharts, annotated diffs, approach tables |
| features pages | `.tsx` | Architecture diagrams, feature flows — all interactive |

`.tsx` files export a default React component rendered by a `page.tsx` dynamic route under the same `DocsLayout`.

### D3: Cloudflare Pages over GitHub Pages

GitHub Pages: no per-branch previews; `/volleybro/` subpath requires `basePath` gymnastics that caused the original header.js bug. Cloudflare Pages: per-commit preview URLs (`<branch>.<project>.pages.dev`), free 500 builds/month, Google OAuth gate via Cloudflare Access (no public access to draft reviews). Static Next.js build (`output: 'export'`) deployed as static files — no server required.

### D4: InteractiveFlowchart as custom SVG component (not Mermaid)

Fumadocs ships a Mermaid plugin, but Mermaid click events only support URL navigation or a global JS callback — they cannot drive React state (e.g., a detail panel toggled per-node). The `<InteractiveFlowchart>` component uses inline SVG with `data-step` attributes; click handler maps step ID → DETAIL object → renders a detail panel via React state. Pattern matches Thariq demo 13.

### D5: spec-loop mockup → design.tsx flow change

Old flow: `discuss → mockup.html → propose → design.html (embeds mockup via iframe) → apply`  
New flow: `discuss → design.tsx (full interactive component, built during discuss) → propose (adds proposal/spec sections) → apply`

The `design.tsx` is the single source of truth for UI design. It is created during discuss and enriched during propose — no separate mockup file, no iframe embedding. This change is documented in `spec-loop/workflow.md` after blueprint is proposed (manual update, not automated).

### D6: 13 components, all Day 1

All 13 components are built in the initial apply — no Tier 2 deferral. The migration content (3 archived changes) exercises all component types and surfaces integration issues early.

**Tier 1** (spec artifact display): `<Scenario>`, `<ExampleTable>`, `<ApproachComparison>`, `<RiskTable>`, `<AnnotatedDiff>`, `<SeverityBadge>`, `<Verdict>`, `<InteractiveFlowchart>`

**Tier 2** (feature showcase + status): `<FeatureExplainer>`, `<ConceptExplainer>`, `<PRWriteup>`, `<Timeline>`, `<TaskProgress>`

Fumadocs provides natively: `Callout`, `Steps`, `Tabs`, `Card`, `CodeBlock`, `Table`, `Mermaid` — these are used directly without wrapping.

### D7: Migration scope — 4 archived changes

Four archived changes are migrated as test content. `apple-splash-dynamic` is migrated first because it has rendered `.html` files from the old spec-pages system — these serve as a concrete visual reference for what the MDX + component output should look like:

- `2026-06-28-apple-splash-dynamic` (has proposal, design, specs, tasks, review — **plus** rendered `.html` versions) — **migrate first**
- `2026-06-16-contextual-edit-pages` (has proposal, design, specs ×3, tasks, review)
- `2026-06-16-api-objectid-guards` (has proposal, design, specs, tasks, review)
- `2026-06-16-team-routes-clean-architecture` (has proposal, design, specs, tasks, review)

Migration means converting each artifact's `.md` content to `.mdx` (prose sections) or `.tsx` (design). The conversion is manual and intentional — not a scripted `.md → .mdx` rename.

## Implementation Contract

### Site structure

```
blueprint/
  package.json          # independent package, no root workspace dep
  next.config.mjs       # output: 'export', basePath: '' (no subpath)
  tailwind.config.ts
  src/
    app/
      layout.tsx         # root layout (fonts, theme provider)
      (docs)/
        layout.tsx       # DocsLayout with sidebar
        changes/
          [[...slug]]/
            page.tsx     # renders MDX via fumadocs source OR imports .tsx design
        features/
          [[...slug]]/
            page.tsx     # imports .tsx feature component
    components/          # 13 custom components
    lib/
      source.ts          # fumadocs loader config
  content/
    changes/
      <name>/
        proposal.mdx
        spec.mdx          # or specs/<cap>/spec.mdx for multi-spec changes
        design.tsx        # exported React component
        tasks.mdx
        review.mdx
      archive/
        <date>-<name>/
          (same structure)
    features/
      <feature>/
        index.tsx
```

### Component API (minimal, expanded in task-level specs)

Each component accepts typed props — no untyped `any`. The 8 Tier 1 components cover artifact display; 5 Tier 2 components cover feature showcase and status. `<InteractiveFlowchart>` accepts `nodes: FlowNode[]` and `details: Record<string, FlowDetail>` and manages click state internally.

### Failure modes

- Missing `.mdx` file: Fumadocs returns 404 via `notFound()` — no crash
- Missing `.tsx` design export: `page.tsx` catches missing default export at build time (type error)
- Cloudflare Pages build failure: preview URL shows build log; main branch not affected until merge
- `output: 'export'` constraint: no server-side data fetching at runtime; all content is static at build time

### Acceptance criteria

1. `pnpm --filter blueprint build` completes without error
2. All 3 migrated changes render all their artifacts (proposal, spec, design, tasks, review) without 404
3. `<InteractiveFlowchart>` in a design.tsx: clicking a node renders a detail panel; clicking another node updates the panel; clicking the same node again toggles it off
4. Dark/light mode toggle persists across page navigation (localStorage)
5. Cloudflare Pages preview URL is accessible and shows the deployed site

### Scope boundaries

In scope: `blueprint/` package, `content/changes/archive/` for 4 migrations, `src/components/` 13 components, CI for Cloudflare Pages.

Out of scope during this change: `docs/header.js` removal, `spec-pages.yml` removal, migrating the remaining 20+ archived changes, `spec-loop/workflow.md` update (manual follow-up after propose).

## Risks / Trade-offs

- **Fumadocs API changes**: Fumadocs is actively developed; pin to a specific minor version and test upgrade separately.
- **`.tsx` design files require valid React at build time**: AI-generated design.tsx for future changes will fail CI if the component has type errors — stricter than the old HTML-as-string approach. This is a feature (early error detection), but authors must know.
- **Static export + Cloudflare Access**: Cloudflare Access sits in front of the Pages URL; no server-side auth. Acceptable for internal review use.
- **Migration is manual**: Converting `.md` to `.mdx` is intentional but tedious for 3 changes. Future bulk migration should be scripted.
