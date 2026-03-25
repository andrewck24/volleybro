## Why

The project lacks a documented testing strategy. Developers make ad-hoc decisions about mocking depth, test scope, and tool choice per layer. A single reference document (`docs/testing-strategy.md`) will codify the conventions that emerged from the test-refactoring discussion and align future test authoring across all Clean Architecture layers.

## What Changes

- Create `docs/testing-strategy.md` with a layer-based testing table covering Entity, UseCase, Infrastructure, Controller, and Component layers
- Define testing school (Classical vs London) and mock boundaries per layer
- Establish frontend testing split: Jest for behavioral tests (no CSS assertions), Storybook + Chromatic for visual regression
- Create `docs/maintenance-policy.md` with dependency update rules (snapshot updates, major version bumps, mock drift)
- Add cross-references in `CLAUDE.md` and `README.md` to point developers to the new docs

## Capabilities

### New Capabilities

(none — this is a documentation-only change with no behavioral impact)

### Modified Capabilities

(none)

## Impact

- docs/testing-strategy.md (new)
- docs/maintenance-policy.md (new)
- docs/architecture.md (cross-reference if created by `component-architecture` change)
- CLAUDE.md (add testing docs reference)
- README.md (update Testing & Quality Assurance section)
