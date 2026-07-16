# blueprint-component-library Specification

## Purpose

TBD - created by archiving change 'blueprint'. Update Purpose after archive.

## Requirements

### Requirement: Typed component props — no runtime errors from missing data

#### Scenario: Component with missing required prop fails at build time

- **WHEN** a `.mdx` or `.tsx` file uses a component with a missing required prop
- **THEN** `pnpm --filter blueprint build` fails with a TypeScript error
- **AND** the error message names the missing prop and the component

#### Scenario: Component renders correctly with all required props

- **WHEN** a component receives all required props of correct types
- **THEN** it renders without throwing a runtime error

<!-- @trace
source: blueprint
updated: 2026-07-14
code:
  - src/components/game/panel/progress-bar.tsx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/proposal.mdx
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/index.mdx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/design.mdx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/specs/entry-input-flow/index.mdx
  - blueprint/src/app/layout.tsx
  - blueprint/src/components/ChangeCard.tsx
  - blueprint/content/changes/meta.json
  - blueprint/content/changes/archive/2026-07-12-entry-ui/review.mdx
  - blueprint/src/components/ui/progress.tsx
  - src/components/game/panel/use-step-swipe.ts
  - blueprint/src/app/page.tsx
  - blueprint/src/components/RiskTable.tsx
  - blueprint/content/changes/discussing/meta.json
  - blueprint/content/changes/discussing/sync-recording/index.mdx
  - src/components/game/header/index.tsx
  - blueprint/content/design-system/components/index.tsx
  - blueprint/src/components/FileTour.tsx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/specs/entry-summary-drawer/index.mdx
  - blueprint/src/app/globals.css
  - src/components/game/panel/moves/index.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/specs/meta.json
  - blueprint/.npmrc
  - blueprint/content/changes/discussing/sync-recording/design.tsx
  - blueprint/content/changes/in-progress/meta.json
  - blueprint/content/changes/discussing/sync-recording/design.mdx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/review.mdx
  - public/apple-splash/828x1792_2x.png
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/meta.json
  - blueprint/src/lib/design-system-tree.ts
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/proposal.mdx
  - blueprint/components.json
  - blueprint/package.json
  - blueprint/content/design-system/index.tsx
  - blueprint/src/components/ChangeOverview.tsx
  - src/lib/features/game/actions/create-rally.ts
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/tasks.mdx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/specs/meta.json
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/tasks.mdx
  - blueprint/src/app/(docs)/changes/[[...slug]]/page.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/proposal.mdx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/specs/contextual-edit-pages/index.mdx
  - CLAUDE.md
  - CHANGELOG.md
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/index.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/specs/api-objectid-validation/index.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/design.tsx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/review.mdx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/design.mdx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/index.mdx
  - blueprint/src/app/(docs)/features/[[...slug]]/page.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/review.mdx
  - blueprint/src/components/Timeline.tsx
  - blueprint/src/app/(docs)/design-system/[[...slug]]/page.tsx
  - blueprint/src/components/TLDR.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/design.tsx
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/tasks.mdx
  - blueprint/src/components/ui/accordion.tsx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/index.mdx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/specs/tab-navigation/index.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/meta.json
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/meta.json
  - pnpm-workspace.yaml
  - public/apple-splash/1080x1920_3x.png
  - scripts/blueprint.mjs
  - src/app/game/[gameId]/sets/[setIndex]/entry/layout.tsx
  - blueprint/content/changes/index.mdx
  - public/apple-splash/750x1334_2x.png
  - package.json
  - src/components/game/panel/moves/ours.tsx
  - src/components/game/preview.tsx
  - blueprint/content/features/game-recording/index.tsx
  - src/app/layout.tsx
  - src/components/game/summary-drawer.tsx
  - blueprint/next.config.mjs
  - src/app/apple-splash/[size]/route.tsx
  - public/apple-splash/1125x2436_3x.png
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/design.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/index.mdx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/proposal.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/proposal.mdx
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/specs/game-data-access/index.mdx
  - src/proxy.ts
  - public/apple-splash/1170x2532_3x.png
  - src/lib/features/game/actions/update-rally.ts
  - src/stories/game/preview.stories.tsx
  - public/apple-splash/1290x2796_3x.png
  - eslint.config.mjs
  - blueprint/src/components/TaskProgress.tsx
  - blueprint/wrangler.toml
  - src/stories/game/entry-progress-bar.stories.tsx
  - .github/workflows/spec-pages.yml
  - blueprint/src/app/(docs)/layout.tsx
  - blueprint/tsconfig.json
  - blueprint/src/components/InteractiveFlowchart.tsx
  - blueprint/postcss.config.mjs
  - blueprint/src/lib/utils.ts
  - src/app/apple-splash/devices.ts
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/design.tsx
  - blueprint/src/components/ui/badge.tsx
  - blueprint/content/changes/discussing/sync-recording/meta.json
  - blueprint/content/changes/archive/2026-07-12-entry-ui/meta.json
  - src/components/game/entry/index.tsx
  - src/components/game/panel/entry-progress.ts
  - src/components/game/panel/index.tsx
  - jest.setup.frontend.ts
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/design.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/specs/form-draft-persistence/index.mdx
  - blueprint/jest.config.ts
  - public/apple-splash/1179x2556_3x.png
  - blueprint/source.config.ts
  - public/apple-splash/1284x2778_3x.png
  - src/components/game/entry/last-entry-rule.ts
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/specs/meta.json
  - src/components/game/panel/moves/oppo.tsx
  - blueprint/src/components/ui/card.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/design.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/specs/meta.json
  - blueprint/src/components/Scenario.tsx
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/specs/team-data-access/index.mdx
  - blueprint/content/changes/archive/meta.json
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/specs/apple-splash/index.mdx
  - src/components/ui/drawer.tsx
  - .changeset/type-decoupling.md
  - jest.config.ts
  - blueprint/src/components/ui/separator.tsx
  - src/stories/game/summary-drawer.stories.tsx
  - .github/workflows/claude-code-review.yml
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/meta.json
  - public/apple-splash/1242x2688_3x.png
  - blueprint/src/components/DocsLayoutShell.tsx
  - src/components/game/options/index.tsx
  - blueprint/src/components/ui/table.tsx
  - src/components/game/index.tsx
  - blueprint/src/lib/source.ts
  - src/stories/game/entry-row.stories.tsx
  - tsconfig.json
  - .markdownlint.jsonc
  - blueprint/src/components/AnnotatedDiff.tsx
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/design.mdx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/tasks.mdx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/design.tsx
tests:
  - blueprint/src/components/TLDR.test.tsx
  - blueprint/src/components/TaskProgress.test.tsx
  - src/components/game/panel/__tests__/entry-progress.test.ts
  - src/app/apple-splash/__tests__/route.test.ts
  - src/components/game/__tests__/preview.test.tsx
  - src/components/game/options/__tests__/index.test.tsx
  - blueprint/src/components/InteractiveFlowchart.test.tsx
  - src/components/game/entry/__tests__/last-entry-rule.test.ts
  - blueprint/src/components/RiskTable.test.tsx
  - src/components/game/panel/__tests__/index.test.tsx
  - blueprint/src/components/Scenario.test.tsx
  - src/components/game/__tests__/summary-drawer.test.tsx
  - src/app/apple-splash/__tests__/devices.test.ts
  - src/components/game/panel/__tests__/progress-bar.test.tsx
  - blueprint/src/components/Timeline.test.tsx
  - blueprint/src/components/FileTour.test.tsx
  - src/components/game/entry/__tests__/entry-row.test.tsx
  - src/components/game/__tests__/gesture-integration.test.tsx
  - blueprint/src/components/AnnotatedDiff.test.tsx
-->

---

### Requirement: Tier 1 artifact display components

All 8 Tier 1 components are available for use in `.mdx` and `.tsx` files.

#### Scenario: Scenario component renders GIVEN/WHEN/THEN structure

- **WHEN** `<Scenario given="..." when="..." then="..." />` is used
- **THEN** the rendered output displays labeled given, when, and then sections

#### Scenario: ApproachComparison renders comparison table

- **WHEN** `<ApproachComparison approaches={[...]} />` is used with an array of `{name, pros, cons}` objects
- **THEN** a comparison table renders with one row per approach

#### Scenario: RiskTable renders severity-ordered rows

- **WHEN** `<RiskTable risks={[...]} />` is used
- **THEN** risks are displayed with name, severity badge, and mitigation column

#### Scenario: AnnotatedDiff renders code diff with inline annotations

- **WHEN** `<AnnotatedDiff diff="..." annotations={[...]} />` is used
- **THEN** diff lines render with syntax highlighting and annotation callouts at the annotated line numbers

#### Scenario: SeverityBadge renders correct color for each severity level

##### Example: Severity badge colors

| severity | expected color token |
| -------- | -------------------- |
| critical | red                  |
| warning  | yellow               |
| info     | blue                 |
| ok       | green                |

- **GIVEN** `<SeverityBadge level="critical" />`
- **THEN** the badge renders with the red color token

#### Scenario: Verdict component renders pass/fail/partial state

- **WHEN** `<Verdict status="pass" />`, `<Verdict status="fail" />`, or `<Verdict status="partial" />` is used
- **THEN** the component renders with a corresponding icon and label

#### Scenario: ExampleTable renders example rows from spec

- **WHEN** `<ExampleTable rows={[...]} headers={[...]} />` is used
- **THEN** a table renders with the provided headers and data rows

<!-- @trace
source: blueprint
updated: 2026-07-14
code:
  - src/components/game/panel/progress-bar.tsx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/proposal.mdx
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/index.mdx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/design.mdx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/specs/entry-input-flow/index.mdx
  - blueprint/src/app/layout.tsx
  - blueprint/src/components/ChangeCard.tsx
  - blueprint/content/changes/meta.json
  - blueprint/content/changes/archive/2026-07-12-entry-ui/review.mdx
  - blueprint/src/components/ui/progress.tsx
  - src/components/game/panel/use-step-swipe.ts
  - blueprint/src/app/page.tsx
  - blueprint/src/components/RiskTable.tsx
  - blueprint/content/changes/discussing/meta.json
  - blueprint/content/changes/discussing/sync-recording/index.mdx
  - src/components/game/header/index.tsx
  - blueprint/content/design-system/components/index.tsx
  - blueprint/src/components/FileTour.tsx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/specs/entry-summary-drawer/index.mdx
  - blueprint/src/app/globals.css
  - src/components/game/panel/moves/index.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/specs/meta.json
  - blueprint/.npmrc
  - blueprint/content/changes/discussing/sync-recording/design.tsx
  - blueprint/content/changes/in-progress/meta.json
  - blueprint/content/changes/discussing/sync-recording/design.mdx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/review.mdx
  - public/apple-splash/828x1792_2x.png
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/meta.json
  - blueprint/src/lib/design-system-tree.ts
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/proposal.mdx
  - blueprint/components.json
  - blueprint/package.json
  - blueprint/content/design-system/index.tsx
  - blueprint/src/components/ChangeOverview.tsx
  - src/lib/features/game/actions/create-rally.ts
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/tasks.mdx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/specs/meta.json
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/tasks.mdx
  - blueprint/src/app/(docs)/changes/[[...slug]]/page.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/proposal.mdx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/specs/contextual-edit-pages/index.mdx
  - CLAUDE.md
  - CHANGELOG.md
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/index.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/specs/api-objectid-validation/index.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/design.tsx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/review.mdx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/design.mdx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/index.mdx
  - blueprint/src/app/(docs)/features/[[...slug]]/page.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/review.mdx
  - blueprint/src/components/Timeline.tsx
  - blueprint/src/app/(docs)/design-system/[[...slug]]/page.tsx
  - blueprint/src/components/TLDR.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/design.tsx
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/tasks.mdx
  - blueprint/src/components/ui/accordion.tsx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/index.mdx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/specs/tab-navigation/index.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/meta.json
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/meta.json
  - pnpm-workspace.yaml
  - public/apple-splash/1080x1920_3x.png
  - scripts/blueprint.mjs
  - src/app/game/[gameId]/sets/[setIndex]/entry/layout.tsx
  - blueprint/content/changes/index.mdx
  - public/apple-splash/750x1334_2x.png
  - package.json
  - src/components/game/panel/moves/ours.tsx
  - src/components/game/preview.tsx
  - blueprint/content/features/game-recording/index.tsx
  - src/app/layout.tsx
  - src/components/game/summary-drawer.tsx
  - blueprint/next.config.mjs
  - src/app/apple-splash/[size]/route.tsx
  - public/apple-splash/1125x2436_3x.png
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/design.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/index.mdx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/proposal.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/proposal.mdx
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/specs/game-data-access/index.mdx
  - src/proxy.ts
  - public/apple-splash/1170x2532_3x.png
  - src/lib/features/game/actions/update-rally.ts
  - src/stories/game/preview.stories.tsx
  - public/apple-splash/1290x2796_3x.png
  - eslint.config.mjs
  - blueprint/src/components/TaskProgress.tsx
  - blueprint/wrangler.toml
  - src/stories/game/entry-progress-bar.stories.tsx
  - .github/workflows/spec-pages.yml
  - blueprint/src/app/(docs)/layout.tsx
  - blueprint/tsconfig.json
  - blueprint/src/components/InteractiveFlowchart.tsx
  - blueprint/postcss.config.mjs
  - blueprint/src/lib/utils.ts
  - src/app/apple-splash/devices.ts
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/design.tsx
  - blueprint/src/components/ui/badge.tsx
  - blueprint/content/changes/discussing/sync-recording/meta.json
  - blueprint/content/changes/archive/2026-07-12-entry-ui/meta.json
  - src/components/game/entry/index.tsx
  - src/components/game/panel/entry-progress.ts
  - src/components/game/panel/index.tsx
  - jest.setup.frontend.ts
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/design.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/specs/form-draft-persistence/index.mdx
  - blueprint/jest.config.ts
  - public/apple-splash/1179x2556_3x.png
  - blueprint/source.config.ts
  - public/apple-splash/1284x2778_3x.png
  - src/components/game/entry/last-entry-rule.ts
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/specs/meta.json
  - src/components/game/panel/moves/oppo.tsx
  - blueprint/src/components/ui/card.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/design.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/specs/meta.json
  - blueprint/src/components/Scenario.tsx
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/specs/team-data-access/index.mdx
  - blueprint/content/changes/archive/meta.json
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/specs/apple-splash/index.mdx
  - src/components/ui/drawer.tsx
  - .changeset/type-decoupling.md
  - jest.config.ts
  - blueprint/src/components/ui/separator.tsx
  - src/stories/game/summary-drawer.stories.tsx
  - .github/workflows/claude-code-review.yml
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/meta.json
  - public/apple-splash/1242x2688_3x.png
  - blueprint/src/components/DocsLayoutShell.tsx
  - src/components/game/options/index.tsx
  - blueprint/src/components/ui/table.tsx
  - src/components/game/index.tsx
  - blueprint/src/lib/source.ts
  - src/stories/game/entry-row.stories.tsx
  - tsconfig.json
  - .markdownlint.jsonc
  - blueprint/src/components/AnnotatedDiff.tsx
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/design.mdx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/tasks.mdx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/design.tsx
tests:
  - blueprint/src/components/TLDR.test.tsx
  - blueprint/src/components/TaskProgress.test.tsx
  - src/components/game/panel/__tests__/entry-progress.test.ts
  - src/app/apple-splash/__tests__/route.test.ts
  - src/components/game/__tests__/preview.test.tsx
  - src/components/game/options/__tests__/index.test.tsx
  - blueprint/src/components/InteractiveFlowchart.test.tsx
  - src/components/game/entry/__tests__/last-entry-rule.test.ts
  - blueprint/src/components/RiskTable.test.tsx
  - src/components/game/panel/__tests__/index.test.tsx
  - blueprint/src/components/Scenario.test.tsx
  - src/components/game/__tests__/summary-drawer.test.tsx
  - src/app/apple-splash/__tests__/devices.test.ts
  - src/components/game/panel/__tests__/progress-bar.test.tsx
  - blueprint/src/components/Timeline.test.tsx
  - blueprint/src/components/FileTour.test.tsx
  - src/components/game/entry/__tests__/entry-row.test.tsx
  - src/components/game/__tests__/gesture-integration.test.tsx
  - blueprint/src/components/AnnotatedDiff.test.tsx
-->

---

### Requirement: Tier 2 feature showcase and status components

#### Scenario: TaskProgress renders done/total counts with progress bar

- **WHEN** `<TaskProgress done={4} total={7} />` is used
- **THEN** a progress bar and "4/7" label render

##### Example: TaskProgress display

- **GIVEN** `<TaskProgress done={0} total={5} />`
- **THEN** progress bar is empty (0%) and label shows "0/5"
- **GIVEN** `<TaskProgress done={5} total={5} />`
- **THEN** progress bar is full (100%) and label shows "5/5"

#### Scenario: Timeline renders ordered events

- **WHEN** `<Timeline events={[{date, label, description}]} />` is used
- **THEN** events render in chronological order with date, label, and description

#### Scenario: PRWriteup renders PR metadata

- **WHEN** `<PRWriteup number={308} title="..." status="merged" />` is used
- **THEN** PR number, title, and a "merged" badge render

<!-- @trace
source: blueprint
updated: 2026-07-14
code:
  - src/components/game/panel/progress-bar.tsx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/proposal.mdx
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/index.mdx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/design.mdx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/specs/entry-input-flow/index.mdx
  - blueprint/src/app/layout.tsx
  - blueprint/src/components/ChangeCard.tsx
  - blueprint/content/changes/meta.json
  - blueprint/content/changes/archive/2026-07-12-entry-ui/review.mdx
  - blueprint/src/components/ui/progress.tsx
  - src/components/game/panel/use-step-swipe.ts
  - blueprint/src/app/page.tsx
  - blueprint/src/components/RiskTable.tsx
  - blueprint/content/changes/discussing/meta.json
  - blueprint/content/changes/discussing/sync-recording/index.mdx
  - src/components/game/header/index.tsx
  - blueprint/content/design-system/components/index.tsx
  - blueprint/src/components/FileTour.tsx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/specs/entry-summary-drawer/index.mdx
  - blueprint/src/app/globals.css
  - src/components/game/panel/moves/index.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/specs/meta.json
  - blueprint/.npmrc
  - blueprint/content/changes/discussing/sync-recording/design.tsx
  - blueprint/content/changes/in-progress/meta.json
  - blueprint/content/changes/discussing/sync-recording/design.mdx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/review.mdx
  - public/apple-splash/828x1792_2x.png
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/meta.json
  - blueprint/src/lib/design-system-tree.ts
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/proposal.mdx
  - blueprint/components.json
  - blueprint/package.json
  - blueprint/content/design-system/index.tsx
  - blueprint/src/components/ChangeOverview.tsx
  - src/lib/features/game/actions/create-rally.ts
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/tasks.mdx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/specs/meta.json
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/tasks.mdx
  - blueprint/src/app/(docs)/changes/[[...slug]]/page.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/proposal.mdx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/specs/contextual-edit-pages/index.mdx
  - CLAUDE.md
  - CHANGELOG.md
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/index.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/specs/api-objectid-validation/index.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/design.tsx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/review.mdx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/design.mdx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/index.mdx
  - blueprint/src/app/(docs)/features/[[...slug]]/page.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/review.mdx
  - blueprint/src/components/Timeline.tsx
  - blueprint/src/app/(docs)/design-system/[[...slug]]/page.tsx
  - blueprint/src/components/TLDR.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/design.tsx
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/tasks.mdx
  - blueprint/src/components/ui/accordion.tsx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/index.mdx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/specs/tab-navigation/index.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/meta.json
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/meta.json
  - pnpm-workspace.yaml
  - public/apple-splash/1080x1920_3x.png
  - scripts/blueprint.mjs
  - src/app/game/[gameId]/sets/[setIndex]/entry/layout.tsx
  - blueprint/content/changes/index.mdx
  - public/apple-splash/750x1334_2x.png
  - package.json
  - src/components/game/panel/moves/ours.tsx
  - src/components/game/preview.tsx
  - blueprint/content/features/game-recording/index.tsx
  - src/app/layout.tsx
  - src/components/game/summary-drawer.tsx
  - blueprint/next.config.mjs
  - src/app/apple-splash/[size]/route.tsx
  - public/apple-splash/1125x2436_3x.png
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/design.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/index.mdx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/proposal.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/proposal.mdx
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/specs/game-data-access/index.mdx
  - src/proxy.ts
  - public/apple-splash/1170x2532_3x.png
  - src/lib/features/game/actions/update-rally.ts
  - src/stories/game/preview.stories.tsx
  - public/apple-splash/1290x2796_3x.png
  - eslint.config.mjs
  - blueprint/src/components/TaskProgress.tsx
  - blueprint/wrangler.toml
  - src/stories/game/entry-progress-bar.stories.tsx
  - .github/workflows/spec-pages.yml
  - blueprint/src/app/(docs)/layout.tsx
  - blueprint/tsconfig.json
  - blueprint/src/components/InteractiveFlowchart.tsx
  - blueprint/postcss.config.mjs
  - blueprint/src/lib/utils.ts
  - src/app/apple-splash/devices.ts
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/design.tsx
  - blueprint/src/components/ui/badge.tsx
  - blueprint/content/changes/discussing/sync-recording/meta.json
  - blueprint/content/changes/archive/2026-07-12-entry-ui/meta.json
  - src/components/game/entry/index.tsx
  - src/components/game/panel/entry-progress.ts
  - src/components/game/panel/index.tsx
  - jest.setup.frontend.ts
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/design.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/specs/form-draft-persistence/index.mdx
  - blueprint/jest.config.ts
  - public/apple-splash/1179x2556_3x.png
  - blueprint/source.config.ts
  - public/apple-splash/1284x2778_3x.png
  - src/components/game/entry/last-entry-rule.ts
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/specs/meta.json
  - src/components/game/panel/moves/oppo.tsx
  - blueprint/src/components/ui/card.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/design.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/specs/meta.json
  - blueprint/src/components/Scenario.tsx
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/specs/team-data-access/index.mdx
  - blueprint/content/changes/archive/meta.json
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/specs/apple-splash/index.mdx
  - src/components/ui/drawer.tsx
  - .changeset/type-decoupling.md
  - jest.config.ts
  - blueprint/src/components/ui/separator.tsx
  - src/stories/game/summary-drawer.stories.tsx
  - .github/workflows/claude-code-review.yml
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/meta.json
  - public/apple-splash/1242x2688_3x.png
  - blueprint/src/components/DocsLayoutShell.tsx
  - src/components/game/options/index.tsx
  - blueprint/src/components/ui/table.tsx
  - src/components/game/index.tsx
  - blueprint/src/lib/source.ts
  - src/stories/game/entry-row.stories.tsx
  - tsconfig.json
  - .markdownlint.jsonc
  - blueprint/src/components/AnnotatedDiff.tsx
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/design.mdx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/tasks.mdx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/design.tsx
tests:
  - blueprint/src/components/TLDR.test.tsx
  - blueprint/src/components/TaskProgress.test.tsx
  - src/components/game/panel/__tests__/entry-progress.test.ts
  - src/app/apple-splash/__tests__/route.test.ts
  - src/components/game/__tests__/preview.test.tsx
  - src/components/game/options/__tests__/index.test.tsx
  - blueprint/src/components/InteractiveFlowchart.test.tsx
  - src/components/game/entry/__tests__/last-entry-rule.test.ts
  - blueprint/src/components/RiskTable.test.tsx
  - src/components/game/panel/__tests__/index.test.tsx
  - blueprint/src/components/Scenario.test.tsx
  - src/components/game/__tests__/summary-drawer.test.tsx
  - src/app/apple-splash/__tests__/devices.test.ts
  - src/components/game/panel/__tests__/progress-bar.test.tsx
  - blueprint/src/components/Timeline.test.tsx
  - blueprint/src/components/FileTour.test.tsx
  - src/components/game/entry/__tests__/entry-row.test.tsx
  - src/components/game/__tests__/gesture-integration.test.tsx
  - blueprint/src/components/AnnotatedDiff.test.tsx
-->

---

### Requirement: InteractiveFlowchart internal state management

#### Scenario: Click state is isolated to the component instance

- **WHEN** two `<InteractiveFlowchart>` components exist on the same page
- **THEN** clicking a node in one component does not affect the detail panel of the other

<!-- @trace
source: blueprint
updated: 2026-07-14
code:
  - src/components/game/panel/progress-bar.tsx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/proposal.mdx
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/index.mdx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/design.mdx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/specs/entry-input-flow/index.mdx
  - blueprint/src/app/layout.tsx
  - blueprint/src/components/ChangeCard.tsx
  - blueprint/content/changes/meta.json
  - blueprint/content/changes/archive/2026-07-12-entry-ui/review.mdx
  - blueprint/src/components/ui/progress.tsx
  - src/components/game/panel/use-step-swipe.ts
  - blueprint/src/app/page.tsx
  - blueprint/src/components/RiskTable.tsx
  - blueprint/content/changes/discussing/meta.json
  - blueprint/content/changes/discussing/sync-recording/index.mdx
  - src/components/game/header/index.tsx
  - blueprint/content/design-system/components/index.tsx
  - blueprint/src/components/FileTour.tsx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/specs/entry-summary-drawer/index.mdx
  - blueprint/src/app/globals.css
  - src/components/game/panel/moves/index.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/specs/meta.json
  - blueprint/.npmrc
  - blueprint/content/changes/discussing/sync-recording/design.tsx
  - blueprint/content/changes/in-progress/meta.json
  - blueprint/content/changes/discussing/sync-recording/design.mdx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/review.mdx
  - public/apple-splash/828x1792_2x.png
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/meta.json
  - blueprint/src/lib/design-system-tree.ts
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/proposal.mdx
  - blueprint/components.json
  - blueprint/package.json
  - blueprint/content/design-system/index.tsx
  - blueprint/src/components/ChangeOverview.tsx
  - src/lib/features/game/actions/create-rally.ts
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/tasks.mdx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/specs/meta.json
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/tasks.mdx
  - blueprint/src/app/(docs)/changes/[[...slug]]/page.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/proposal.mdx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/specs/contextual-edit-pages/index.mdx
  - CLAUDE.md
  - CHANGELOG.md
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/index.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/specs/api-objectid-validation/index.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/design.tsx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/review.mdx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/design.mdx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/index.mdx
  - blueprint/src/app/(docs)/features/[[...slug]]/page.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/review.mdx
  - blueprint/src/components/Timeline.tsx
  - blueprint/src/app/(docs)/design-system/[[...slug]]/page.tsx
  - blueprint/src/components/TLDR.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/design.tsx
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/tasks.mdx
  - blueprint/src/components/ui/accordion.tsx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/index.mdx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/specs/tab-navigation/index.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/meta.json
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/meta.json
  - pnpm-workspace.yaml
  - public/apple-splash/1080x1920_3x.png
  - scripts/blueprint.mjs
  - src/app/game/[gameId]/sets/[setIndex]/entry/layout.tsx
  - blueprint/content/changes/index.mdx
  - public/apple-splash/750x1334_2x.png
  - package.json
  - src/components/game/panel/moves/ours.tsx
  - src/components/game/preview.tsx
  - blueprint/content/features/game-recording/index.tsx
  - src/app/layout.tsx
  - src/components/game/summary-drawer.tsx
  - blueprint/next.config.mjs
  - src/app/apple-splash/[size]/route.tsx
  - public/apple-splash/1125x2436_3x.png
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/design.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/index.mdx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/proposal.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/proposal.mdx
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/specs/game-data-access/index.mdx
  - src/proxy.ts
  - public/apple-splash/1170x2532_3x.png
  - src/lib/features/game/actions/update-rally.ts
  - src/stories/game/preview.stories.tsx
  - public/apple-splash/1290x2796_3x.png
  - eslint.config.mjs
  - blueprint/src/components/TaskProgress.tsx
  - blueprint/wrangler.toml
  - src/stories/game/entry-progress-bar.stories.tsx
  - .github/workflows/spec-pages.yml
  - blueprint/src/app/(docs)/layout.tsx
  - blueprint/tsconfig.json
  - blueprint/src/components/InteractiveFlowchart.tsx
  - blueprint/postcss.config.mjs
  - blueprint/src/lib/utils.ts
  - src/app/apple-splash/devices.ts
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/design.tsx
  - blueprint/src/components/ui/badge.tsx
  - blueprint/content/changes/discussing/sync-recording/meta.json
  - blueprint/content/changes/archive/2026-07-12-entry-ui/meta.json
  - src/components/game/entry/index.tsx
  - src/components/game/panel/entry-progress.ts
  - src/components/game/panel/index.tsx
  - jest.setup.frontend.ts
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/design.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/specs/form-draft-persistence/index.mdx
  - blueprint/jest.config.ts
  - public/apple-splash/1179x2556_3x.png
  - blueprint/source.config.ts
  - public/apple-splash/1284x2778_3x.png
  - src/components/game/entry/last-entry-rule.ts
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/specs/meta.json
  - src/components/game/panel/moves/oppo.tsx
  - blueprint/src/components/ui/card.tsx
  - blueprint/content/changes/archive/2026-06-16-contextual-edit-pages/design.mdx
  - blueprint/content/changes/archive/2026-06-16-api-objectid-guards/specs/meta.json
  - blueprint/src/components/Scenario.tsx
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/specs/team-data-access/index.mdx
  - blueprint/content/changes/archive/meta.json
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/specs/apple-splash/index.mdx
  - src/components/ui/drawer.tsx
  - .changeset/type-decoupling.md
  - jest.config.ts
  - blueprint/src/components/ui/separator.tsx
  - src/stories/game/summary-drawer.stories.tsx
  - .github/workflows/claude-code-review.yml
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/meta.json
  - public/apple-splash/1242x2688_3x.png
  - blueprint/src/components/DocsLayoutShell.tsx
  - src/components/game/options/index.tsx
  - blueprint/src/components/ui/table.tsx
  - src/components/game/index.tsx
  - blueprint/src/lib/source.ts
  - src/stories/game/entry-row.stories.tsx
  - tsconfig.json
  - .markdownlint.jsonc
  - blueprint/src/components/AnnotatedDiff.tsx
  - blueprint/content/changes/archive/2026-06-16-team-routes-clean-architecture/design.mdx
  - blueprint/content/changes/archive/2026-06-28-apple-splash-dynamic/tasks.mdx
  - blueprint/content/changes/archive/2026-07-12-entry-ui/design.tsx
tests:
  - blueprint/src/components/TLDR.test.tsx
  - blueprint/src/components/TaskProgress.test.tsx
  - src/components/game/panel/__tests__/entry-progress.test.ts
  - src/app/apple-splash/__tests__/route.test.ts
  - src/components/game/__tests__/preview.test.tsx
  - src/components/game/options/__tests__/index.test.tsx
  - blueprint/src/components/InteractiveFlowchart.test.tsx
  - src/components/game/entry/__tests__/last-entry-rule.test.ts
  - blueprint/src/components/RiskTable.test.tsx
  - src/components/game/panel/__tests__/index.test.tsx
  - blueprint/src/components/Scenario.test.tsx
  - src/components/game/__tests__/summary-drawer.test.tsx
  - src/app/apple-splash/__tests__/devices.test.ts
  - src/components/game/panel/__tests__/progress-bar.test.tsx
  - blueprint/src/components/Timeline.test.tsx
  - blueprint/src/components/FileTour.test.tsx
  - src/components/game/entry/__tests__/entry-row.test.tsx
  - src/components/game/__tests__/gesture-integration.test.tsx
  - blueprint/src/components/AnnotatedDiff.test.tsx
-->
