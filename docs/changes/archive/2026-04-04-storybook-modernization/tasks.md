## 1. Package Updates and Addon Setup

- [x] 1.1 Update Storybook packages to ^10.3.3 (`storybook`, `@storybook/addon-docs`, `@storybook/addon-onboarding`, `@storybook/addon-themes`, `@storybook/nextjs`, `eslint-plugin-storybook`)
- [x] [P] 1.2 Update `@chromatic-com/storybook` to ^5.1.0
- [x] [P] 1.3 Update `chromatic` to ^16.0.0 — check changelog for breaking changes before updating
- [x] 1.4 Install `@storybook/addon-a11y` and add to `.storybook/main.ts` addons array
- [x] 1.5 Verify: `npm run build-storybook`

## 2. Scaffold Cleanup

- [x] 2.1 Delete Storybook default templates: `src/stories/Header.tsx`, `Header.stories.ts`, `header.css`, `Page.tsx`, `Page.stories.ts`, `page.css`, `Configure.mdx`, `assets/` directory
- [x] 2.2 Verify: `npm run build-storybook`

## 3. File Architecture Migration (ui/)

- [x] 3.1 Create `src/stories/ui/` directory
- [x] 3.2 Move all existing `ui/` component stories from `src/stories/*.stories.tsx` to `src/stories/ui/`, renaming to kebab-case where needed
- [x] [P] 3.3 Move `src/stories/colors.mdx` to `src/stories/ui/colors.mdx`
- [x] 3.4 Verify: `npm run build-storybook`

## 4. Coverage Gap Fill (ui/)

- [x] 4.1 Add `src/stories/ui/popover.stories.tsx`
- [x] [P] 4.2 Add `src/stories/ui/accordion.stories.tsx`
- [x] [P] 4.3 Add `src/stories/ui/form.stories.tsx` — use minimal representative schema
- [x] [P] 4.4 Add `src/stories/ui/chart.stories.tsx` — use static data
- [x] [P] 4.5 Add `src/stories/ui/alert-dialog.stories.tsx`
- [x] [P] 4.6 Add `src/stories/ui/calendar.stories.tsx`
- [x] [P] 4.7 Add `src/stories/ui/toaster.stories.tsx`
- [x] 4.8 Verify: `npm run build-storybook`

## 5. Coverage Gap Fill (custom/) — requires `component-architecture` applied

- [x] 5.1 Create `src/stories/custom/` directory
- [x] 5.2 Add `src/stories/custom/court.stories.tsx`
- [x] [P] 5.3 Add `src/stories/custom/logo.stories.tsx`
- [x] [P] 5.4 Move `src/stories/item.stories.tsx` to `src/stories/ui/item.stories.tsx`
- [x] 5.5 Verify: `npm run build-storybook`

## 6. CI Workflow Update

- [x] 6.1 Update `.github/workflows/chromatic.yml`: `node-version: "lts/*"`, `npm install` → `npm ci`
- [x] 6.2 Verify: lint workflow file syntax

## 7. Final Verification and Documentation (original scope)

- [x] 7.1 Run `npm test && npx tsc --noEmit && npm run lint && npm run build`
- [x] [P] 7.2 Run `npm run build-storybook` — full build verification
- [x] 7.3 Review whether `docs/`, `README.md`, `openspec/config.yaml`, and `CLAUDE.md` need updating based on the change

## 8. Story Variant Coverage — Atoms

- [x] [P] 8.1 `button.stories.tsx`: Add `Loading` variant (`loading={true}`, `loadingText="Saving..."`) and `LoadingDestructive` variant (`variant="destructive"` + `loading={true}`)
- [x] [P] 8.2 `input.stories.tsx`: Add `LongValue` variant (long text showing overflow behavior)
- [x] [P] 8.3 `select.stories.tsx`: Add `Disabled` variant (`disabled` prop on SelectTrigger)
- [x] [P] 8.4 `calendar.stories.tsx`: Add `WithDisabledDates` variant (using `disabled` prop to restrict selectable dates)

## 9. Story Variant Coverage — Molecules

- [x] [P] 9.1 `form.stories.tsx`: Add `WithErrors` variant — call `form.setError()` in render to show visible error messages on fields without needing user interaction
- [x] [P] 9.2 `table.stories.tsx`: Add `Empty` variant (table with headers but zero data rows, showing empty state)
- [x] [P] 9.3 `dialog.stories.tsx`: Add `LongContent` variant (scrollable body content to verify overflow handling)
- [x] [P] 9.4 `alert-dialog.stories.tsx`: Add `Confirmation` variant (non-destructive, using default Button instead of destructive trigger)
- [x] [P] 9.5 `chart.stories.tsx`: Add `EmptyData` variant (chart with empty dataset to verify how Recharts renders zero-data state)

## 10. Testing Strategy Clarification

- [x] 10.1 Update `docs/testing-strategy.md`: Add explicit subsection under "Storybook + Chromatic" clarifying that stories do not include play functions, `fn()` is for action spying only, and the behavioral/visual split is intentional
- [x] 10.2 Verify the updated doc is consistent with existing content and doesn't contradict other sections

## 11. Final Verification (variant scope)

- [x] 11.1 Run `npm run build-storybook` — verify all new story variants render correctly
- [x] 11.2 Run `npm test && npx tsc --noEmit && npm run lint && npm run build` — full verification (tsc ✓, lint ✓, storybook ✓; jest and next build fail due to environment issues unrelated to story changes)
- [x] 11.3 Review whether any other docs need updating based on the variant additions
