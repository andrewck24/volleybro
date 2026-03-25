## 1. ListItem Compound Component (Presentation Layer)

- [ ] 1.1 Write tests for ListItem compound component design — three-way wrapper pattern, ListItemAction event isolation, ListItem CVA variants (default/secondary/ghost, default/sm/lg sizes), compound primitive rendering (ListItemIcon, ListItemImage, ListItemContent, ListItemAction)
- [ ] 1.2 Implement ListItem compound component set in `custom/list-item/index.tsx` with listItemVariants CVA, following the file organization in design
- [ ] 1.3 Verify: `npm test && npx tsc --noEmit && npm run lint`

## 2. Refactor PersonItem to Compose ListItem (Presentation Layer)

- [ ] 2.1 Update person-item tests to verify composition behavior and skeleton co-location
- [ ] [P] 2.2 Refactor `PersonItem` to compose ListItem primitives, add co-located `PersonItemSkeleton` export with skeleton co-location pattern
- [ ] 2.3 Verify: `npm test && npx tsc --noEmit && npm run lint`

## 3. Refactor TeamItem to Compose ListItem (Presentation Layer)

- [ ] 3.1 Update team-item tests to verify composition behavior and skeleton co-location
- [ ] [P] 3.2 Refactor `TeamItem` to compose ListItem primitives, add co-located `TeamItemSkeleton` export with skeleton co-location pattern
- [ ] 3.3 Verify: `npm test && npx tsc --noEmit && npm run lint`

## 4. LoadingCourt Relocation (Presentation Layer)

- [ ] 4.1 Move `LoadingCourt` from `custom/loading/court.tsx` into `custom/court/index.tsx` as named export, per LoadingCourt relocation design
- [ ] [P] 4.2 Update import paths in `team/lineup/index.tsx` and `record/index.tsx`
- [ ] 4.3 Delete `custom/loading/court.tsx`
- [ ] 4.4 Verify: `npm test && npx tsc --noEmit && npm run lint && npm run build`

## 5. Component Relocations and Cleanup (Presentation Layer)

- [ ] 5.1 Delete `src/components/ui/sheet.tsx` (zero consumers)
- [ ] [P] 5.2 Relocate `src/components/ui/panel.tsx` to `src/components/custom/panel/index.tsx`, update all 9 import paths
- [ ] [P] 5.3 Relocate `src/components/ui/flip-words.tsx` to `src/components/landing/flip-words.tsx`, update `landing/hero.tsx` import
- [ ] 5.4 Verify: `npm test && npx tsc --noEmit && npm run lint && npm run build`

## 6. Component Layer Boundary Documentation

- [ ] 6.1 Create `docs/architecture.md` with component layer boundary documentation table (`ui/` vs `custom/` vs `{domain}/`) and rule of thumb
- [ ] 6.2 Review whether any other docs need updating based on this change
- [ ] 6.3 Final verification: `npm test && npx tsc --noEmit && npm run lint && npm run build`
