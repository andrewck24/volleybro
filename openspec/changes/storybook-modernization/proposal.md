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
│   └── ...
└── custom/                ← mirrors components/custom/
    ├── list-item.stories.tsx
    └── ...
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
- **`custom/`**: Add stories for cross-domain composites after `component-architecture` change is applied (ListItem, court, logo)

### Accessibility addon

Install and configure `@storybook/addon-a11y` for visual accessibility auditing in Storybook UI, complementing existing `jest-axe` CI checks.

### Package updates

Update all Storybook/Chromatic ecosystem packages to latest, including `chromatic` ^15 → ^16 (major bump).

### CI workflow

Update `.github/workflows/chromatic.yml`: Node `lts/*`, `npm ci`.

## Dependencies

- **Depends on `component-architecture`**: The `custom/` story coverage tasks require `component-architecture` to be applied first (ListItem compound pattern, panel/flip-words relocation, sheet deletion).

## Impact

- src/stories/ (restructure: flat → `ui/` + `custom/` subdirectories)
- src/stories/ui/\*.stories.tsx (move existing + add 7 new)
- src/stories/custom/\*.stories.tsx (new — ListItem, court, logo)
- src/stories/ scaffold files (delete)
- .storybook/main.ts (add addon-a11y)
- package.json + package-lock.json (Storybook/Chromatic package updates + addon-a11y)
- .github/workflows/chromatic.yml (Node lts/\*, npm ci)
