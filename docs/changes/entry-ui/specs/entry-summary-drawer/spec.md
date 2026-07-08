## ADDED Requirements

### Requirement: Summary is a bottom drawer anchored to the Preview

The Summary SHALL be a bottom drawer anchored to the Preview's top edge, independent of the Options dialog. In its idle state the drawer SHALL expose only a handle and the latest entry. When expanded, the latest entry SHALL rise with the top edge and become the first row of the list in place.

#### Scenario: Idle drawer shows handle and latest entry

- **WHEN** the drawer is idle
- **THEN** the drawer SHALL show only the handle and the latest entry

#### Scenario: Expanding promotes the latest entry to the first row

- **WHEN** the user expands the drawer
- **THEN** the latest entry SHALL rise and become the first row of the entry list

### Requirement: Entry actions are revealed by swipe or inline expansion

Each entry row SHALL reveal its action buttons on left-swipe. Tapping a row SHALL inline-expand it as an accordion showing recordedBy, time, and the full set of actions, without leaving the list.

#### Scenario: Left-swipe reveals action buttons

- **WHEN** the user left-swipes an entry row
- **THEN** the row SHALL reveal its action buttons

#### Scenario: Tap inline-expands the row in place

- **WHEN** the user taps an entry row
- **THEN** the row SHALL expand in place to show recordedBy, time, and its actions while remaining in the list

### Requirement: Button composition follows the last-entry rule

Action buttons SHALL be composed by the last-entry rule: the latest entry SHALL offer edit and delete; every other entry SHALL offer edit and "roll back and re-record to here". The visible alternative path SHALL replace a disabled delete button for non-latest entries.

#### Scenario: Latest entry exposes edit and delete

- **WHEN** actions are revealed for the latest entry
- **THEN** the buttons SHALL be edit and delete

#### Scenario: Non-latest entry exposes rollback instead of delete

- **WHEN** actions are revealed for an entry that is not the latest
- **THEN** the buttons SHALL be edit and "roll back and re-record to here", and no disabled delete button SHALL be shown

### Requirement: Gesture split while input is in progress

While input is in progress, tapping the Preview SHALL only handle submission (submit when the three steps are complete, no effect otherwise). The handle SHALL always toggle the drawer. When the drawer is expanded during input, the draft SHALL occupy the first row in a pulsing in-progress style distinct from committed entries, and on freeze SHALL become the formal first entry in place.

#### Scenario: Preview tap during input only submits

- **WHEN** input is in progress and the user taps the Preview with the three steps complete
- **THEN** the system SHALL submit the entry and SHALL NOT expand the drawer

#### Scenario: Handle expands drawer during input with draft in first row

- **WHEN** input is in progress and the user opens the drawer via the handle
- **THEN** the drawer SHALL expand and the draft SHALL appear as the pulsing first row distinct from committed entries
