# blueprint-shadcn-refactor

## Summary

Rebuild the blueprint component library on shadcn/ui primitives with a unified CSS token
system, per spec-loop `blueprint.md` base mapping. Paca Story: VB-7 (Epic #5).

## Why

Component styling is unstable across three tiers:

1. **Unstyled skeletons** — most of the 10 spec components render bare markup
   (severity labels were plain `span`s with data attributes).
2. **Three competing token sources** — `ChangeCard`/`ChangeOverview` mix hand-written
   `--primary`/`--border` oklch values, fumadocs `--color-fd-*` variables, and arbitrary
   Tailwind values (`text-[13px]`).
3. **Hard-coded colors** — `InteractiveFlowchart` uses `fill="#6366f1"` and a fixed
   400×200 viewport; dark mode breaks.

## What

- Initialize shadcn/ui in `blueprint/` (Tailwind v4, `components.json`, `cn` util).
- Unify tokens: shadcn semantic tokens (`--background`, `--card`, `--muted`,
  `--destructive`, `--primary`, …) become the single source; existing brand oklch values
  become token values; fumadocs `--color-fd-*` variables bridge to the same tokens; add a
  custom `--warning` token.
- Add primitives via CLI: badge, table, card, tabs, progress, accordion, separator.
  `Badge` is used directly (with CVA variants) for both severity indicators and general
  labels (e.g. 採用/棄用); there is no dedicated severity wrapper component.
- Rebuild all 10 spec components + `ChangeCard`/`ChangeOverview` per the base mapping in
  spec-loop `blueprint.md`. `Verdict` (thin `Badge` wrapper), `ExampleTable` (raw
  `<table>`; Fumadocs renders tables natively), and `FeatureExplainer` (hand-rolled
  accordion) are dropped rather than rebuilt — use `Badge` / `ui/accordion` directly.
  `InteractiveFlowchart` stays custom SVG but takes color from
  CSS variables and uses a responsive `viewBox`.

## Out of scope

- New components or API changes beyond restyling (props stay compatible).
- Style-assertion tests (existing behavior tests must stay green).
- Extracting the library to a shared package (deferred until a second consuming repo).

## Risk / rollback

Main risk: fumadocs preset CSS vs shadcn layer priority. The tracer task (init + token
bridge + `badge` primitive) exposes this before the batch migration. Rollback = revert the
branch; content (MDX/TSX) is untouched.
