## 1. Initialize blueprint package

- [x] 1.1 A `blueprint/package.json` exists as an independent Next.js 15+ package with Fumadocs (`fumadocs-ui`, `fumadocs-core`, `fumadocs-mdx`), Tailwind CSS, and TypeScript dependencies — verify by running `pnpm --filter blueprint install` without error
- [x] 1.2 `blueprint/next.config.mjs` is configured with `output: 'export'` and no `basePath` — verify that `pnpm --filter blueprint build` produces a `blueprint/out/` directory with static HTML
- [x] 1.3 `blueprint/src/lib/source.ts` defines the Fumadocs loader pointing at `content/changes/` and `content/features/` — verify that `source.getPages()` returns an array (can be empty) without throwing

## 2. App layout and routing

- [x] 2.1 `blueprint/src/app/layout.tsx` renders the root HTML shell with Fumadocs `RootProvider` (theme + search) — verify dark/light toggle persists across client-side navigation (localStorage key `theme`)
- [x] 2.2 `blueprint/src/app/(docs)/layout.tsx` renders `DocsLayout` with a sidebar; sidebar sections are "Changes" (under `/changes/`) and "Features" (under `/features/`) — verify by running the dev server and confirming both sections appear
- [x] 2.3 `blueprint/src/app/(docs)/changes/[[...slug]]/page.tsx` renders MDX artifacts for `.mdx` slug paths and imports the default React export for `.tsx` design files; missing pages return `notFound()` — verify by navigating to a migrated change's proposal and to a non-existent slug (expect 404)
- [x] 2.4 `blueprint/src/app/(docs)/features/[[...slug]]/page.tsx` imports the default React export from the matching `content/features/<slug>/index.tsx` file and renders it inside `DocsLayout` — verify by loading a stub feature page without error

## 3. Tier 1 component library — artifact display

- [x] [P] 3.1 `<Scenario given props when then />` renders a three-section GIVEN/WHEN/THEN block — verify by writing a failing test (`Scenario.test.tsx`) that asserts all three section labels appear, then implementing the component to pass
- [x] [P] 3.2 `<ExampleTable headers rows />` renders a table with a header row and one data row per entry in `rows` — verify by writing a failing test that checks header count and row count, then implementing to pass
- [x] [P] 3.3 `<ApproachComparison approaches />` where each approach is `{name: string, pros: string[], cons: string[]}` renders a comparison table with one row per approach — verify by failing test asserting row count equals `approaches.length`, then implement to pass
- [x] [P] 3.4 `<RiskTable risks />` where each risk is `{name, severity, mitigation}` renders rows sorted by severity (critical first) — verify by failing test with mixed-severity input checking rendered order, then implement to pass
- [x] [P] 3.5 `<SeverityBadge level />` where level is `'critical' | 'warning' | 'info' | 'ok'` renders a badge with a data-level attribute matching the prop — verify by failing test asserting `data-level` attribute value for each of the 4 levels, then implement to pass
- [x] [P] 3.6 `<Verdict status />` where status is `'pass' | 'fail' | 'partial'` renders the status label and a corresponding icon — verify by failing test asserting the label text for each status, then implement to pass
- [x] [P] 3.7 `<AnnotatedDiff diff annotations />` where `diff` is a unified diff string and `annotations` is `{line: number, note: string}[]` renders diff lines with annotation callouts at the specified line numbers — verify by failing test asserting an annotation note appears adjacent to its line, then implement to pass
- [x] [P] 3.8 `<InteractiveFlowchart nodes details />` where `nodes: {id: string, label: string, x: number, y: number}[]` and `details: Record<string, {title: string, body: string}>` renders an SVG with clickable nodes; clicking a node shows its detail panel; clicking the same node again closes the panel; two instances on the same page have independent state — verify by failing tests covering each interaction, then implement with React `useState` holding the active step ID

## 4. Tier 2 component library — feature showcase and status

- [x] [P] 4.1 `<TaskProgress done total />` renders a progress bar at `done/total * 100%` width and a label showing "done/total" — verify by failing test with `done=3, total=7` asserting bar width style is "42.857...%" and label text is "3/7", then implement to pass
- [x] [P] 4.2 `<Timeline events />` where each event is `{date: string, label: string, description: string}` renders events in the provided array order with date, label, and description visible — verify by failing test asserting all three fields appear for each event, then implement to pass
- [x] [P] 4.3 `<PRWriteup number title status />` where status is `'open' | 'merged' | 'closed'` renders the PR number prefixed with `#`, the title, and a badge with the status label — verify by failing test for each status value, then implement to pass
- [x] [P] 4.4 `<FeatureExplainer title summary steps />` where each step is `{label: string, detail: string}` renders the title, summary, and an expandable list of steps (each step toggles detail on click) — verify by failing test asserting step detail is hidden by default and visible after click, then implement
- [x] [P] 4.5 `<ConceptExplainer term definition example />` renders the term prominently, the definition as prose, and the example in a visually distinct block — verify by failing test asserting all three are rendered, then implement

## 5. Migrate 4 archived changes as blueprint content

- [x] 5.1 `blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/` contains `proposal.mdx`, `design.tsx`, `tasks.mdx`, `review.mdx`, and `specs/apple-splash/spec.mdx` — this change already has rendered `.html` files in `docs/changes/archive/2026-06-28-apple-splash-dynamic/` which serve as visual reference for the expected output; verify by running `pnpm --filter blueprint build` and confirming all artifact URLs for this change return 200
- [x] [P] 5.2 `blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/` contains `proposal.mdx`, `design.tsx`, `tasks.mdx`, `review.mdx`, and `specs/` with one `.mdx` per spec — verify by running `pnpm --filter blueprint build` and confirming all artifact URLs for this change return 200 (no 404 in build output)
- [x] [P] 5.3 `blueprint/content/changes/archive/2026-06-16-api-objectid-guards/` contains the same artifact set, converted from the `.md` originals in `docs/changes/archive/` — verify same way as 5.2
- [x] [P] 5.4 `blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/` contains the same artifact set — verify same way as 5.2
- [x] 5.5 The blueprint sidebar lists all four migrated changes under an "Archive" group and each artifact tab link navigates without 404 — verify manually in dev server

## 6. Feature showcase stub

- [x] 6.1 `blueprint/content/features/game-recording/index.tsx` exports a default React component that uses `<InteractiveFlowchart>` with at least 3 nodes representing the game recording flow — verify by building and loading `/features/game-recording` in dev server without error

## 7. Cloudflare Pages deployment

- [x] 7.1 A Cloudflare Pages build config (`blueprint/wrangler.toml` or `.cloudflare/pages.json`) specifies the build command `pnpm --filter blueprint build` and publish directory `blueprint/out` — verify that a local `wrangler pages dev blueprint/out` serves the static site without error

## 8. Full build validation

- [x] 8.1 `pnpm --filter blueprint build` completes without TypeScript errors or Next.js build errors — verify by running the command and checking exit code is 0
- [x] 8.2 All 13 component tests pass (`pnpm --filter blueprint test`) — verify by running the test suite and checking all tests pass
