## 1. Shadcn Item as Base Primitive (Presentation Layer)

- [x] ~~1.1 Write tests for ListItem compound component design~~ (superseded — replaced by Shadcn Item)
- [x] ~~1.2 Implement ListItem compound component set~~ (superseded — replaced by Shadcn Item)
- [x] 1.3 Install Shadcn Item component via `npx shadcn@latest add item` into `src/components/ui/item.tsx`, verify it includes Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemFooter, ItemGroup, ItemSeparator
- [x] 1.4 Remove custom `src/components/custom/list-item/index.tsx` and `src/components/custom/list-item/__tests__/list-item.test.tsx` (superseded by Shadcn Item), per file organization design
- [x] 1.5 Write Storybook story for Shadcn Item in `src/stories/custom/list-item.stories.tsx` — cover two item forms (navigable with `asChild`, static with `ItemActions`), action footer pattern, variant/size combinations per design
- [x] 1.6 Verify: `npm test && npx tsc --noEmit && npm run lint`

## 2. Refactor PersonItem to Compose Shadcn Item (Presentation Layer)

- [ ] 2.1 Update person-item tests to verify composition with Shadcn Item, two item forms, and skeleton co-location per design
- [ ] [P] 2.2 Refactor `PersonItem` to compose Shadcn Item primitives (ItemMedia, ItemContent, ItemTitle), support `asChild` for navigable form, add co-located `PersonItemSkeleton` export per PersonItem and TeamItem as custom wrappers and skeleton co-location design
- [ ] 2.3 Update all PersonItem consumers (players/list.tsx, record/new/roster-list.tsx) to use new composition API per two item forms design
- [ ] 2.4 Verify: `npm test && npx tsc --noEmit && npm run lint`

## 3. Refactor TeamItem to Compose Shadcn Item (Presentation Layer)

- [ ] 3.1 Update team-item tests to verify composition with Shadcn Item, two item forms, and skeleton co-location per design
- [ ] [P] 3.2 Refactor `TeamItem` to compose Shadcn Item primitives (ItemMedia, ItemContent, ItemTitle), support `asChild` for navigable form, add co-located `TeamItemSkeleton` export per skeleton co-location design
- [ ] 3.3 Update all TeamItem consumers (user/invitations, user/menu) to use new composition API — invitations adopt action footer pattern per design
- [ ] 3.4 Verify: `npm test && npx tsc --noEmit && npm run lint`

## 4. LoadingCourt Relocation (Presentation Layer)

- [ ] 4.1 Move `LoadingCourt` from `custom/loading/court.tsx` into `custom/court/index.tsx` as named export, per LoadingCourt relocation design
- [ ] [P] 4.2 Update import paths in `team/lineup/index.tsx` and `record/index.tsx`
- [ ] 4.3 Delete `custom/loading/court.tsx`
- [ ] 4.4 Verify: `npm test && npx tsc --noEmit && npm run lint && npm run build`

## 5. Component Relocations and Cleanup (Presentation Layer)

- [ ] 5.1 Delete `src/components/ui/sheet.tsx` (zero consumers) per component relocations and cleanup design
- [ ] [P] 5.2 Relocate `src/components/ui/panel.tsx` to `src/components/custom/panel/index.tsx`, update all 9 import paths per component relocations and cleanup design
- [ ] [P] 5.3 Relocate `src/components/ui/flip-words.tsx` to `src/components/landing/flip-words.tsx`, update `landing/hero.tsx` import per component relocations and cleanup design
- [ ] 5.4 Verify: `npm test && npx tsc --noEmit && npm run lint && npm run build`

## 6. Component Layer Boundary Documentation

- [ ] 6.1 Create `docs/architecture.md` with component layer boundary documentation table (`ui/` vs `custom/` vs `{domain}/`) and rule of thumb per design
- [ ] 6.2 Review whether any other docs need updating based on this change
- [ ] 6.3 Final verification: `npm test && npx tsc --noEmit && npm run lint && npm run build`
