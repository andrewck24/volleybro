## Context

The project has a working Jest setup with backend/frontend project split (`jest.config.ts`), global mocks for MongoDB/Mongoose (`jest.setup.backend.ts`), and browser API mocks (`jest.setup.frontend.ts`). However, there is no written guide on which testing school to apply per layer, what to mock vs. use directly, or how Storybook/Chromatic fits alongside Jest. Developers rediscover these decisions each time they write a new test file.

## Goals / Non-Goals

**Goals:**

- Produce a single `docs/testing-strategy.md` that developers consult before writing tests
- Define the testing school (Classical vs London) and mock boundaries for each Clean Architecture layer
- Clarify the Jest vs Storybook/Chromatic split for frontend components
- Create `docs/maintenance-policy.md` for dependency update rules (will be iterated by future changes)

**Non-Goals:**

- Rewriting or refactoring existing tests (covered by other changes)
- Adding new test tooling or frameworks
- Achieving a specific coverage target

## Decisions

### Layer-based testing table

A single table maps each Clean Architecture layer to its testing school, mock boundaries, and examples:

| Layer                                     | School    | What to mock                                             | What stays real                      | Example                           |
| ----------------------------------------- | --------- | -------------------------------------------------------- | ------------------------------------ | --------------------------------- |
| Entity (`src/entities/`)                  | Classical | Nothing                                                  | Everything                           | Pure logic, validation            |
| UseCase (`src/applications/`)             | Classical | Repository & service interfaces                          | Entity logic, use case orchestration | Inject mock repo, verify output   |
| Infrastructure (`src/infrastructure/`)    | Classical | DB driver (MongoDB/Mongoose via `jest.setup.backend.ts`) | Repository implementation logic      | Global mock already in place      |
| Controller (`src/interface/controllers/`) | London    | UseCase classes                                          | Controller orchestration             | Stub use case, verify delegation  |
| Component (`src/components/`)             | Classical | API calls, custom hooks (SWR/Redux)                      | Rendering, user interaction, DOM     | Mock `fetch`/hooks, test behavior |

**Rationale:** Classical testing (prefer real collaborators) is the default because it catches integration issues early. London style (isolate the SUT with mocks) is used only for controllers, where testing through real use cases would duplicate application-layer coverage and add fragile setup.

**School emphasis:**

- **Classical (state verification)**: Assert on the _output_ or _resulting state_ after exercising the SUT with real collaborators. Catches integration issues but tests may be slower and harder to diagnose.
- **London (behavior verification)**: Assert that the SUT _called the right collaborators with the right arguments_. Provides precise failure messages but couples tests to implementation details.

### Frontend testing split

- **Jest + React Testing Library**: Behavioral tests — user interactions, conditional rendering, accessibility (`jest-axe`). No CSS assertions (class names, computed styles) in Jest tests.
- **Storybook + Chromatic**: Visual regression — layout, spacing, color, responsive breakpoints. Stories serve as living documentation and visual test cases.

**Rationale:** CSS assertions in Jest are brittle (Tailwind classes change, test breaks with no visual difference). Chromatic catches actual visual regressions via screenshot diffing.

### Maintenance policy document

Dependency update rules (major version bumps, mock drift) belong in a separate `docs/maintenance-policy.md` rather than inside the testing strategy. This keeps `testing-strategy.md` focused on _how to write tests_ while `maintenance-policy.md` covers _how to keep tooling healthy_. The maintenance policy will be iterated by future changes (e.g., `storybook-modernization`, `typescript-6-upgrade`).

Rules are **general** — they apply to any package upgrade, not specific to MongoDB/Mongoose. Examples are used for illustration only.

Initial sections for `docs/maintenance-policy.md`:

1. **Major version bumps** (any package): Create a dedicated branch, run full suite, follow the official migration guide, review breaking changes
2. **Mock drift**: After upgrading any dependency that sits behind a mock boundary, verify the mock surface still matches the real API

**Snapshot updates not included**: The project currently has no Jest snapshot tests. If snapshots are introduced in the future, a dedicated maintenance rule should be added at that time.

**Rationale:** Test infrastructure silently drifts from production dependencies without explicit rules. Separating this into its own document allows non-testing maintenance rules to be added later.

### Story coverage requirements

`docs/testing-strategy.md` will include a **Story Coverage Requirements** section defining which component layers require Storybook stories:

| Layer        | Story Required                           | Location              |
| ------------ | ---------------------------------------- | --------------------- |
| `ui/`        | Yes — every component                    | `src/stories/ui/`     |
| `custom/`    | Yes — cross-domain composites            | `src/stories/custom/` |
| `{domain}/`  | No — behavioral via Jest, visual via E2E | —                     |

This codifies the decision from the `storybook-modernization` discussion and ensures new components get stories from day one.

### Document structure

```text
docs/testing-strategy.md
├── Introduction (purpose, audience)
├── Layer Testing Table (with school emphasis notes)
├── Frontend Testing Split (Jest vs Storybook)
├── Mock Boundaries (what lives in setup files vs. inline)
└── Quick Reference (cheat sheet)

docs/maintenance-policy.md
├── Major Version Bumps (general, any package)
└── Mock Drift (general, any mocked dependency)

CONTRIBUTING.md  ← entry point for contributors
├── Branch & PR workflow
├── Conventional Commit convention (types, scope, examples)
├── Code style (Airbnb + ESLint + Prettier)
└── Links → docs/testing-strategy.md, docs/maintenance-policy.md
```

## Risks / Trade-offs

- [Adoption risk] Document exists but developers don't read it → Mitigation: keep it concise (single page), add a quick-reference cheat sheet at the bottom, cross-reference from `docs/architecture.md`, add pointers in `CLAUDE.md` (Testing section) and `README.md` (Testing & Quality Assurance section)
- [Staleness risk] Strategy drifts as tooling evolves → Mitigation: `openspec/config.yaml` task rules now require docs review on every change
