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

- [ ] 6.1 Update `.github/workflows/chromatic.yml`: `node-version: "lts/*"`, `npm install` → `npm ci`
- [ ] 6.2 Verify: lint workflow file syntax

## 7. Final Verification and Documentation

- [ ] 7.1 Run `npm test && npx tsc --noEmit && npm run lint && npm run build`
- [ ] [P] 7.2 Run `npm run build-storybook` — full build verification
- [ ] 7.3 Review whether `docs/`, `README.md`, `openspec/config.yaml`, and `CLAUDE.md` need updating based on the change
