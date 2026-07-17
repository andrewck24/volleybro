## ADDED Requirements

### Requirement: Change artifact navigation

A user visiting the blueprint site can browse all Spectra changes and navigate between their artifacts.

#### Scenario: Sidebar shows all changes with status indicators

- **WHEN** a user opens the blueprint site
- **THEN** the Fumadocs sidebar lists all changes under "Changes" grouped by active vs. archive
- **AND** each change entry is clickable and navigates to its overview page

#### Scenario: Artifact tab navigation within a change

- **WHEN** a user is on a change's overview page
- **THEN** they can navigate to Proposal, Spec, Design, Tasks, and Review tabs
- **AND** only tabs with content (existing `.mdx` or `.tsx` files) are shown
- **AND** the active tab is visually distinguished

#### Scenario: Missing artifact gracefully handled

- **WHEN** a user navigates to an artifact URL for a change that has no such artifact
- **THEN** the page returns a 404 with Fumadocs' standard not-found UI
- **AND** no JavaScript error is thrown

### Requirement: Archive browsing

Users can browse historically archived changes as read-only content.

#### Scenario: Archive changes accessible under a distinct path

- **WHEN** a user navigates to `/changes/archive/<date>-<name>/proposal`
- **THEN** the proposal content renders correctly
- **AND** the sidebar groups archived changes visually separate from active ones

### Requirement: Changes homepage

The changes homepage at `/changes` lists all in-progress and archived changes, giving users an entry point into the portal.

#### Scenario: Homepage lists in-progress changes

- **WHEN** a user navigates to `/changes`
- **THEN** an "In Progress" section is visible
- **AND** each in-progress change is listed with its name and a short summary
- **AND** the change entry links to its page or description

#### Scenario: Homepage lists archived changes

- **WHEN** a user navigates to `/changes`
- **THEN** an "Archive" section is visible listing all archived changes
- **AND** each archived change entry links to its index page at `/changes/archive/<date-name>/`

### Requirement: Per-change index page

Each archived change has an index page that lists all of its artifact links, including design.

#### Scenario: Change index page shows all artifact links

- **GIVEN** the user navigates to `/changes/archive/<date-name>/`
- **THEN** the page displays the change name and a short summary
- **AND** links are rendered for: Proposal, Design, Tasks, Review, and Specs
- **AND** clicking "Design" navigates to `/changes/archive/<date-name>/design` and renders the design component
- **AND** the Design link is present even though the design page is not in the fumadocs sidebar

#### Scenario: Design page renders via designModules

- **WHEN** a user navigates directly to `/changes/archive/<date-name>/design`
- **THEN** the design TSX component renders inside the DocsPage shell
- **AND** no 404 is returned

### Requirement: Dark/light theme persistence

#### Scenario: Theme persists across page navigation

- **WHEN** a user toggles to dark mode and then navigates to a different artifact
- **THEN** the theme remains dark without flash

##### Example: Theme persistence

- **GIVEN** user is in dark mode on the proposal page
- **WHEN** user clicks the "Spec" tab
- **THEN** the spec page renders in dark mode immediately (no light flash on load)
