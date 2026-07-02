# Tasks — blueprint-shadcn-refactor

## 1. Tracer: shadcn init + token bridge + SeverityBadge

- [ ] 1.1 `shadcn init` in `blueprint/` (Tailwind v4); merge generated CSS with existing
      fumadocs imports in `src/app/globals.css`
- [ ] 1.2 Token unification: brand oklch values onto shadcn semantic tokens; custom
      `--warning`/`--warning-foreground`; bridge used `--color-fd-*` variables to the
      same tokens
- [ ] 1.3 Add `badge` primitive; rebuild `SeverityBadge` on `Badge` with CVA variants
      (critical→destructive, warning→warning, info→secondary, ok→outline); keep
      `data-testid`/`data-level`
- [ ] 1.4 Verify: `pnpm --filter blueprint type-check && test && build`; light/dark
      visual check

## 2. Batch: status + prose components

- [ ] 2.1 Add `card`, `progress`, `separator`; rebuild `Verdict`, `Timeline`,
      `TaskProgress`, `Scenario`, `ConceptExplainer`, `FeatureExplainer`, `PRWriteup`
- [ ] 2.2 Verify: tests + build

## 3. Batch: tables, comparison, index, flowchart

- [ ] 3.1 Add `table`, `tabs`, `accordion`; rebuild `RiskTable`, `ExampleTable`,
      `ApproachComparison`, `AnnotatedDiff`
- [ ] 3.2 Rebuild `ChangeCard`, `ChangeOverview` on `Card`+`Badge`; remove arbitrary
      values
- [ ] 3.3 `InteractiveFlowchart`: CSS-variable colors + responsive `viewBox`
- [ ] 3.4 Verify: full type-check/test/build + light/dark visual check of migrated
      changes
