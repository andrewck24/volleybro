## ADDED Requirements

### Requirement: Feature documentation pages

Interactive `.tsx` pages document VolleyBro features with diagrams and walkthroughs.

#### Scenario: Feature page renders without server-side data

- **WHEN** a user navigates to `/features/<feature-name>`
- **THEN** the page renders fully from static build output (no server-side fetch at runtime)
- **AND** all interactive elements (flowchart nodes, expandable sections) function client-side

#### Scenario: InteractiveFlowchart node click reveals detail panel

- **WHEN** a user clicks a flowchart node with a `data-step` attribute
- **THEN** a detail panel renders below the flowchart with the node's title, metadata, and body content
- **AND** clicking a different node updates the panel to show that node's details
- **AND** clicking the same node again closes the panel

##### Example: Flowchart interaction

- **GIVEN** a flowchart with nodes "Record Rally" (step: `record-rally`) and "Finalize Set" (step: `finalize-set`)
- **WHEN** user clicks "Record Rally"
- **THEN** detail panel shows title "Record Rally" and its body content
- **WHEN** user then clicks "Finalize Set"
- **THEN** detail panel updates to show "Finalize Set" content (previous panel replaced)
- **WHEN** user clicks "Finalize Set" again
- **THEN** detail panel closes

#### Scenario: Feature showcase listed in sidebar

- **WHEN** a user visits the blueprint site
- **THEN** the Fumadocs sidebar includes a "Features" section
- **AND** each feature entry navigates to its `.tsx` page
