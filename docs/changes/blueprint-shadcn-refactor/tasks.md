# Tasks — blueprint-shadcn-refactor

## 1. Tracer: shadcn init + token bridge + badge primitive

- [x] 1.1 `shadcn init` in `blueprint/` (Tailwind v4); merge generated CSS with existing
      fumadocs imports in `src/app/globals.css`
- [x] 1.2 Token unification: brand oklch values onto shadcn semantic tokens; custom
      `--warning`/`--warning-foreground`; bridge used `--color-fd-*` variables to the
      same tokens
- [x] 1.3 Add `badge` primitive; use `Badge` directly with CVA variants
      (critical→destructive, warning→warning, info→secondary, ok→outline) for both
      severity and general labels (e.g. 採用/棄用). No `SeverityBadge` wrapper — it was
      dropped as unused.
- [x] 1.4 Verify: `pnpm --filter blueprint type-check && test && build`; light/dark
      visual check

## 2. Batch: status + prose components

- [x] 2.1 Add `card`, `progress`, `separator`; rebuild `Timeline`,
      `TaskProgress`, `Scenario`, `ConceptExplainer`, `PRWriteup`. No `Verdict`
      (thin `Badge` wrapper) or `FeatureExplainer` (hand-rolled accordion) — both
      dropped as unused; use `Badge` / `ui/accordion` directly.
- [x] 2.2 Verify: tests + build

## 3. Batch: tables, comparison, index, flowchart

- [x] 3.1 Add `table`, `tabs`, `accordion`; rebuild `RiskTable`,
      `ApproachComparison`, `AnnotatedDiff`. No `ExampleTable` (raw `<table>`
      wrapper) — dropped as unused; Fumadocs renders markdown tables natively.
- [x] 3.2 Rebuild `ChangeCard`, `ChangeOverview` on `Card`+`Badge`; remove arbitrary
      values
- [x] 3.3 `InteractiveFlowchart`: CSS-variable colors + responsive `viewBox`
- [x] 3.4 Verify: full type-check/test/build all green (no hard-coded hex/arbitrary
      values remain). Light/dark **visual** check still pending human review.
