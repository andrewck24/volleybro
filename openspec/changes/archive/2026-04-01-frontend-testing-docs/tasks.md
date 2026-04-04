## 1. Testing Strategy Document (Documentation)

- [x] 1.1 Create `docs/testing-strategy.md` with the layer-based testing table (Entity/UseCase/Infrastructure/Controller/Component), including school emphasis (state verification vs behavior verification)
- [x] [P] 1.2 Write the frontend testing split section (Jest behavioral vs Storybook/Chromatic visual regression)
- [x] [P] 1.3 Write the mock boundaries section (what lives in setup files vs. inline)
- [x] [P] 1.4 Write the story coverage requirements section (ui/ = required, custom/ = required, domain/ = not required)
- [x] [P] 1.5 Add a quick reference cheat sheet following the document structure from design
- [x] 1.6 Verify: `npm run lint && npm run build`

## 2. Maintenance Policy Document (Documentation)

- [x] 2.1 Create `docs/maintenance-policy.md` with two sections: (1) Major Version Bumps — general rule for any package: dedicated branch, run full suite, follow official migration guide; (2) Mock Drift — general rule: after upgrading any mocked dependency, verify mock surface still matches real API (no snapshot section — project has no snapshot tests yet)
- [x] 2.2 Verify: `npm run lint && npm run build`

## 3. Contributing Guide (Documentation)

- [x] 3.1 Create `CONTRIBUTING.md` as contributor entry point with: (1) Branch & PR workflow (feature/fix branches → dev, PR title in English + zh-TW summary); (2) Conventional commit types table (feat/fix/docs/refactor/test/chore/build/ci/perf/style with descriptions and examples); (3) Code style section (Airbnb + ESLint + Prettier, link to `npm run lint`); (4) Testing section linking to `docs/testing-strategy.md`; (5) Maintenance section linking to `docs/maintenance-policy.md`
- [x] [P] 3.2 Simplify `README.md`: replace the entire 貢獻指南/Contribution Guidelines section (commit convention, code style subsections) with a single line linking to `CONTRIBUTING.md`; keep the Testing & Quality Assurance section but add a reference to `CONTRIBUTING.md` for testing guidance
- [x] [P] 3.3 Update `CLAUDE.md` Testing section to reference `docs/testing-strategy.md` and `docs/maintenance-policy.md`

## 4. Cross-References and Final Verification

- [x] 4.1 If `docs/architecture.md` exists (from `component-architecture` change), add cross-reference to testing strategy and CONTRIBUTING.md
- [x] 4.2 Review whether `openspec/config.yaml` needs updating based on this change
- [x] 4.3 Final verification: `npm run test && npx tsc --noEmit && npm run lint && npm run build`
