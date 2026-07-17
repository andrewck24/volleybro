## 1. Shadcn Item as Base Primitive (Presentation Layer)

- [x] ~~1.1 Write tests for ListItem compound component design~~ (superseded — replaced by Shadcn Item)
- [x] ~~1.2 Implement ListItem compound component set~~ (superseded — replaced by Shadcn Item)
- [x] 1.3 Install Shadcn Item component via `npx shadcn@latest add item` into `src/components/ui/item.tsx`, verify it includes Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemFooter, ItemGroup, ItemSeparator
- [x] 1.4 Remove custom `src/components/custom/list-item/index.tsx` and `src/components/custom/list-item/__tests__/list-item.test.tsx` (superseded by Shadcn Item), per file organization design
- [x] 1.5 Write Storybook story for Shadcn Item in `src/stories/item.stories.tsx` — cover direct consumer composition, invitation overlay-link pattern, variant/size combinations per design
- [x] 1.6 Verify: `npm test && npx tsc --noEmit && npm run lint`

## 2. Remove Thin Item Wrappers (Presentation Layer)

- [x] 2.1 Delete `src/components/custom/list-item/person-item.tsx` and `src/components/custom/list-item/team-item.tsx`
- [x] [P] 2.2 Delete wrapper tests under `src/components/custom/__tests__/list-item/`
- [x] 2.3 Update player and roster consumers to compose `Item` primitives directly
- [x] 2.4 Verify: `npm test && npx tsc --noEmit && npm run lint`

## 3. Compose Team Rows in Domain Components (Presentation Layer)

- [x] 3.1 Add generic helper support in `src/components/ui/item.tsx` for direct composition (`ItemAvatar`)
- [x] [P] 3.2 Update `user/menu/index.tsx` to compose joined-team rows locally with `useTeam`
- [x] 3.3 Update `user/invitations/index.tsx` to compose invitation rows locally and keep the row clickable except for action buttons
- [x] 3.4 Verify: `npm test && npx tsc --noEmit && npm run lint`

## 4. LoadingCourt Relocation (Presentation Layer)

- [x] 4.1 Move `LoadingCourt` from `custom/loading/court.tsx` into `custom/court/index.tsx` as named export, per LoadingCourt relocation design
- [x] [P] 4.2 Update import paths in `team/lineup/index.tsx` and `record/index.tsx`
- [x] 4.3 Delete `custom/loading/court.tsx`
- [x] 4.4 Verify: `npm test && npx tsc --noEmit && npm run lint && npm run build`

## 5. Component Relocations and Cleanup (Presentation Layer)

- [x] 5.1 Delete `src/components/ui/sheet.tsx` (zero consumers) per component relocations and cleanup design
- [x] [P] 5.2 Relocate `src/components/ui/panel.tsx` to `src/components/custom/panel/index.tsx`, update all 9 import paths per component relocations and cleanup design
- [x] [P] 5.3 Relocate `src/components/ui/flip-words.tsx` to `src/components/landing/flip-words.tsx`, update `landing/hero.tsx` import per component relocations and cleanup design
- [x] 5.4 Run `/simplify`, and verify: `npm test && npx tsc --noEmit && npm run lint && npm run build`

## 6. Component Layer Boundary Documentation

- [x] 6.1 Create `docs/architecture.md` with component layer boundary documentation table (`ui/` vs `custom/` vs `{domain}/`) and rule of thumb per design
- [x] 6.2 Review whether any other docs need updating based on this change
- [x] 6.3 Final verification: `npm test && npx tsc --noEmit && npm run lint && npm run build`
