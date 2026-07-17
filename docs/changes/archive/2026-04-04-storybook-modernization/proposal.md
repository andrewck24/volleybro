## Summary

Modernize the Storybook setup by reorganizing story file architecture, filling coverage gaps for `ui/` and `custom/` components, cleaning up scaffold boilerplate, adding accessibility auditing, and updating Storybook/Chromatic packages.

## Motivation

The current Storybook setup has several issues:

1. **Coverage gaps** — 7 of 24 `ui/` components have no story (popover, accordion, form, chart, alert-dialog, calendar, toaster); `custom/` components have zero stories
2. **Flat file structure** — All stories live in `src/stories/` without subdirectory organization, making it hard to map stories to component layers
3. **Scaffold boilerplate** — Storybook default templates (Header, Page, Configure.mdx, assets/, css) remain in the project
4. **No accessibility auditing** — `jest-axe` covers CI but there is no visual a11y audit during development
5. **Package versions** — Storybook/Chromatic packages are behind latest; `chromatic` has a major version bump available
6. **CI workflow** — `chromatic.yml` uses hardcoded Node 20 instead of `lts/*`

## Proposed Solution

### File architecture migration

Restructure `src/stories/` to mirror the component layer hierarchy:

```text
src/stories/
├── ui/                    ← mirrors components/ui/
│   ├── button.stories.tsx
│   ├── item.stories.tsx
│   └── ...
└── custom/                ← mirrors components/custom/
    ├── court.stories.tsx
    └── logo.stories.tsx
```

- Move existing stories from `src/stories/*.stories.tsx` to `src/stories/ui/`
- Add `src/stories/custom/` for cross-domain composite component stories
- Naming convention: **kebab-case** (`alert-dialog.stories.tsx`)
- Preserve title structure: `Design System/Atoms/...`, `Design System/Molecules/...`

### Scaffold cleanup

Delete all Storybook default templates:

- `src/stories/Header.tsx`, `Header.stories.ts`, `header.css`
- `src/stories/Page.tsx`, `Page.stories.ts`, `page.css`
- `src/stories/Configure.mdx`
- `src/stories/assets/` directory

### Coverage gap fill

- **`ui/`**: Add stories for 7 missing components — popover, accordion, form, chart, alert-dialog, calendar, toaster
- **`custom/`**: Add stories for cross-domain composites after `component-architecture` change is applied (court, logo)

### Story variant coverage

Many existing stories only have 1–2 variants covering the happy path. For Chromatic to catch visual regressions on edge cases, key boundary states need story variants. Focus on states the component **actually supports via props** (not hypothetical states):

- **Button**: `loading` prop is supported but has no story variant
- **Form**: No error-state variant — only happy path and validation rules (errors not visually shown)
- **Table**: No empty-state variant (zero rows)
- **Select**: No `disabled` variant
- **Dialog**: No long/scrollable content variant
- **AlertDialog**: Only 1 variant (destructive); missing non-destructive confirmation
- **Chart**: No empty-data variant

**Scope boundary**: Only add variants for visual states that are already supported by the component API. Do not add play functions — interaction testing belongs to Jest + RTL per `docs/testing-strategy.md`.

### Testing strategy clarification

Update `docs/testing-strategy.md` to make the Storybook positioning explicit:

- Storybook stories do **not** include play functions (no interaction tests)
- Stories serve as **visual regression targets** (Chromatic) and **living documentation**
- Behavioral testing of interactions is exclusively handled by Jest + RTL
- This avoids duplicating coverage between Storybook play functions and Jest + RTL

### Accessibility addon

Install and configure `@storybook/addon-a11y` for visual accessibility auditing in Storybook UI, complementing existing `jest-axe` CI checks.

### Package updates

Update all Storybook/Chromatic ecosystem packages to latest, including `chromatic` ^15 → ^16 (major bump).

### CI workflow

Update `.github/workflows/chromatic.yml`: Node `lts/*`, `npm ci`.

## Dependencies

- **Depends on `component-architecture`**: The story coverage tasks require `component-architecture` to be applied first (Item primitive story, panel/flip-words relocation, sheet deletion).

## Impact

- src/stories/ (restructure: flat → `ui/` + `custom/` subdirectories)
- src/stories/ui/\*.stories.tsx (move existing + add 7 new + add boundary variants)
- src/stories/custom/\*.stories.tsx (new — court, logo)
- src/stories/ scaffold files (delete)
- .storybook/main.ts (add addon-a11y)
- package.json + package-lock.json (Storybook/Chromatic package updates + addon-a11y)
- .github/workflows/chromatic.yml (Node lts/\*, npm ci)
- docs/testing-strategy.md (clarify Storybook positioning: no play functions)
