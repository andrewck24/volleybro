## 1. Testing Strategy Document (Documentation)

- [ ] 1.1 Create `docs/testing-strategy.md` with the layer-based testing table (Entity/UseCase/Infrastructure/Controller/Component), including school emphasis (state verification vs behavior verification)
- [ ] [P] 1.2 Write the frontend testing split section (Jest behavioral vs Storybook/Chromatic visual regression)
- [ ] [P] 1.3 Write the mock boundaries section (what lives in setup files vs. inline)
- [ ] [P] 1.4 Add a quick reference cheat sheet following the document structure from design
- [ ] 1.5 Verify: `npm run lint && npm run build`

## 2. Maintenance Policy Document (Documentation)

- [ ] 2.1 Create `docs/maintenance-policy.md` with the maintenance policy document sections (snapshot updates, major version bumps, mock drift)
- [ ] 2.2 Verify: `npm run lint && npm run build`

## 3. Cross-References and Documentation Updates

- [ ] 3.1 Update `CLAUDE.md` Testing section to reference `docs/testing-strategy.md` and `docs/maintenance-policy.md`
- [ ] [P] 3.2 Update `README.md` Testing & Quality Assurance section to reference the new docs
- [ ] [P] 3.3 If `docs/architecture.md` exists (from `component-architecture` change), add cross-reference to testing strategy
- [ ] 3.4 Review whether `openspec/config.yaml` needs updating based on this change
- [ ] 3.5 Final verification: `npm run test && npx tsc --noEmit && npm run lint && npm run build`
