## Context

Storybook 10.3.1 and Chromatic 15.3.0 are already installed. The current setup works but has organizational debt:

- 14 stories in a flat `src/stories/` directory alongside Storybook scaffold boilerplate
- No subdirectory structure to mirror component layers (`ui/`, `custom/`, `{domain}/`)
- 7 `ui/` components lack stories: popover, accordion, form, chart, alert-dialog, calendar, toaster
- 0 `custom/` components have stories
- No accessibility addon despite `jest-axe` being used in Jest tests
- Storybook/Chromatic packages are slightly behind latest
- `chromatic.yml` workflow uses hardcoded Node 20 instead of `lts/*`

The `.storybook/main.ts` glob (`../src/**/*.stories.@(js|jsx|mjs|ts|tsx)`) already picks up stories from any location under `src/`, so file moves require no config change.

**Dependency**: This change depends on `component-architecture` being applied first. The story coverage tasks require the Item primitive story, panel relocation to `custom/`, flip-words relocation to `landing/`, and sheet deletion to be completed.

## Goals / Non-Goals

**Goals:**

- Restructure story files into a layered directory mirroring component organization
- Achieve 100% story coverage for `ui/` components
- Add stories for `custom/` cross-domain composites (court, logo)
- Remove Storybook scaffold boilerplate
- Add `@storybook/addon-a11y` for visual accessibility auditing
- Update Storybook/Chromatic packages to latest
- Update `chromatic.yml` workflow (Node lts/\*, npm ci)

**Non-Goals:**

- Writing stories for domain-level components (`record/`, `team/`, etc.)
- Introducing Storybook interaction tests (Jest handles behavioral testing)
- Upgrading `actions/checkout` or `actions/setup-node` versions (cross-cutting CI maintenance)
- Upgrading non-Storybook packages (eslint, typescript, mongoose, recharts)

## Decisions

### File structure: mirrored subdirectories under `src/stories/`

Stories will be organized by component layer:

```text
src/stories/
├── ui/                         ← mirrors components/ui/
│   ├── button.stories.tsx
│   ├── card.stories.tsx
│   ├── item.stories.tsx        ← moved from root after component-architecture
│   ├── accordion.stories.tsx   ← new
│   └── ...
└── custom/                     ← mirrors components/custom/
    ├── court.stories.tsx       ← new
    └── logo.stories.tsx        ← new
```

**Why not co-locate** (`components/ui/button.stories.tsx`): `ui/` already has 24 files. Adding stories would push it to 48+, making it harder for humans to navigate. A mirrored `stories/` directory keeps component directories clean while maintaining a clear 1:1 mapping.

### Naming convention

- File names: **kebab-case** (`alert-dialog.stories.tsx`)
- Storybook title: preserve existing Atomic Design hierarchy (`Design System/Atoms/...`, `Design System/Molecules/...`)
- Component classification:
  - **Atoms**: Single-purpose primitives (Button, Input, Label, Badge, Separator, Calendar)
  - **Molecules**: Composed from atoms (Card, Dialog, Alert, AlertDialog, Accordion, Form, Select, Tabs, Table, RadioGroup, Popover, Toast/Toaster, Chart, Description)
  - **Composites**: Cross-domain composed components (Court, Logo) — title: `Design System/Composites/...`

### Scaffold cleanup

Delete all Storybook default files that were auto-generated during `npx storybook init`:

- `src/stories/Header.tsx`, `Header.stories.ts`, `header.css`
- `src/stories/Page.tsx`, `Page.stories.ts`, `page.css`
- `src/stories/Configure.mdx`
- `src/stories/assets/` (17 image/svg files)

### Accessibility addon

Add `@storybook/addon-a11y` to `.storybook/main.ts` addons array. This runs axe-core on every story and displays results in the Storybook UI panel.

Relationship to `jest-axe`:

- `jest-axe` = programmatic a11y assertions in CI (gate)
- `addon-a11y` = visual a11y audit in Storybook UI (development feedback)

Both use axe-core under the hood; they complement each other.

### Package updates

Storybook/Chromatic ecosystem packages:

| Package                       | Current | Target       |
| ----------------------------- | ------- | ------------ |
| `storybook`                   | ^10.3.1 | ^10.3.3      |
| `@storybook/addon-docs`       | ^10.3.1 | ^10.3.3      |
| `@storybook/addon-onboarding` | ^10.3.1 | ^10.3.3      |
| `@storybook/addon-themes`     | ^10.3.1 | ^10.3.3      |
| `@storybook/nextjs`           | ^10.3.1 | ^10.3.3      |
| `@chromatic-com/storybook`    | ^5.0.2  | ^5.1.0       |
| `eslint-plugin-storybook`     | 10.3.1  | 10.3.3       |
| `chromatic`                   | ^15.3.0 | ^16.0.0      |
| `@storybook/addon-a11y`       | —       | latest (new) |

Note: `chromatic` ^15 → ^16 is a major bump — verify changelog for breaking changes before updating.

### Chromatic workflow update

Update `.github/workflows/chromatic.yml`:

- `node-version: 20` → `node-version: "lts/*"` (consistent with `release.yml`)
- `npm install` → `npm ci` (CI best practice: deterministic installs)
- Preserve existing `paths` filter and `[skip chromatic]` condition

## Risks / Trade-offs

| Risk                                                  | Likelihood | Mitigation                                                                                                   |
| ----------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------ |
| Moving stories breaks Storybook build                 | Low        | `.storybook/main.ts` glob already covers all `src/` subdirectories; verify with `npm run build-storybook`    |
| Some `ui/` components are hard to story (form, chart) | Medium     | Use minimal representative examples; form stories can use a simple schema, chart stories can use static data |
| `chromatic` v16 has breaking changes                  | Medium     | Check changelog before updating; run Chromatic build to verify                                               |
| `colors.mdx` doesn't fit the `ui/` mirror pattern     | Low        | Move to `src/stories/ui/colors.mdx` as a design system doc page                                              |
| `custom/` stories blocked by `component-architecture` | —          | Tasks are ordered: `ui/` stories first, `custom/` stories after dependency is met                            |
