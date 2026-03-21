## ADDED Requirements

### Requirement: PersonItem component renders person information in a unified layout

The PersonItem component (Presentation layer) SHALL render a horizontal flex container with: an avatar circle (image or fallback icon), a truncated name, an optional metadata area (via children), and an optional action slot. When `href` is provided, the root element SHALL render as a Next.js `<Link>`. When `onClick` is provided (without `href`), the root element SHALL render as a `<button>`. When neither is provided, the root element SHALL render as a `<div>`.

#### Scenario: PersonItem with href navigates on click

- **WHEN** a PersonItem is rendered with `href="/team/123/players/456"`
- **THEN** the root element SHALL be a `<Link>` that navigates to the given path

#### Scenario: PersonItem action slot does not trigger parent navigation

- **WHEN** a PersonItem has `href` and an action slot button is clicked
- **THEN** the action button's click handler SHALL fire without triggering the parent Link navigation

#### Scenario: PersonItem without href or onClick renders static

- **WHEN** a PersonItem is rendered without `href` or `onClick`
- **THEN** the root element SHALL be a `<div>` with no interactive behavior

### Requirement: TeamItem component displays team information fetched by teamId

The TeamItem component (Presentation layer) SHALL accept a `teamId` prop, fetch team data via `useTeam(teamId)`, and display the team name. It SHALL follow the same visual layout as PersonItem (avatar icon, name, metadata, action slot) and support the same `href`/`onClick` navigation pattern. While loading, it SHALL display a skeleton placeholder for the team name.

#### Scenario: TeamItem resolves and displays team name

- **WHEN** a TeamItem is rendered with `teamId` pointing to a team named "Thunder"
- **THEN** the component SHALL display "Thunder" as the primary text after loading

#### Scenario: TeamItem shows loading state

- **WHEN** a TeamItem is rendered and team data has not yet loaded
- **THEN** the component SHALL display a skeleton placeholder in place of the team name

### Requirement: Invitations display team names using TeamItem

The Invitations component SHALL use TeamItem (instead of Table rows) to display each pending invitation. Each TeamItem SHALL show the team name (not the player name). Accept and reject actions SHALL be rendered in the TeamItem's action slot.

#### Scenario: Invitation shows team name instead of player name

- **WHEN** a user views their invitations
- **THEN** each invitation SHALL display the team name fetched via `useTeam(player.teamId)`

### Requirement: Menu team list displays team names using TeamItem

The Menu component's team list SHALL use TeamItem to display joined teams. Each TeamItem SHALL show the team name (not the player name). The currently active team SHALL be visually distinguished.

#### Scenario: Menu shows team name for joined teams

- **WHEN** a user expands the team list in the menu
- **THEN** each team SHALL display the team name fetched via `useTeam(player.teamId)` instead of `player.name`

### Requirement: RosterList uses PersonItem instead of Table

The RosterList component (renamed from RosterTable) SHALL use PersonItem to display each player. The jersey number SHALL appear in the metadata area and the role badge (先發/自由) SHALL appear in the action slot.

#### Scenario: RosterList displays player with number and badge

- **WHEN** a starting player with number 7 is rendered in the roster
- **THEN** the PersonItem SHALL show the player name, "#7" in metadata, and "先發" badge in the action slot
