## ADDED Requirements

### Requirement: Summary is a single drawer: a peek that rises to an expanded sheet

The Summary SHALL be independent of the Options dialog and SHALL be a single bottom drawer — not a separate peek plus a portalled modal — with two snap states, so the peek's top row is the top edge of the same drawer that expands. In its **idle/peek** state it SHALL show only a handle at the top edge and the top row beneath it, on the same card surface as the Options dialog. When **expanded** it SHALL rise to a dialog-scale sheet (~85dvh) with a backdrop overlay that appears only while expanded, and SHALL collapse back to the peek on overlay tap, Escape, or handle tap.

The drawer's scrollable list SHALL show every committed entry as an actionable row, newest first. The top row follows the two states: while recording, an uncommitted draft Preview bar SHALL sit above the committed list; while idle there SHALL be no separate Preview bar — the newest committed entry is simply the top row. The uncommitted draft SHALL NOT appear as a committed list row.

The drawer surface SHALL be borderless — no ring or border — matching the game page's design tokens. Committed entry rows and the Preview SHALL share a single uniform entry box (`p-1` plus rounded corners); when the draft is submittable the Preview SHALL fill that box with the primary color (send icon in `primary-foreground`) so it reads as a confirm/send button.

#### Scenario: Idle peek shows the handle and the newest entry as the top row

- **WHEN** the drawer is idle and not recording
- **THEN** the peek SHALL show the handle at the top edge and the newest committed entry as the top row, with no separate Preview bar

#### Scenario: Expanding rises to a sheet with a backdrop overlay

- **WHEN** the user expands the drawer
- **THEN** the same drawer SHALL rise to a dialog-scale sheet (~85dvh) with a backdrop overlay that is absent at the peek

#### Scenario: The newest committed entry is the top row of the list

- **WHEN** the drawer is expanded and not recording
- **THEN** the newest committed entry SHALL be the top row of the list — the same element that peeked — and every committed entry SHALL be an actionable row

### Requirement: Entry actions are revealed by swipe or inline expansion

Each entry row SHALL reveal its action buttons on left-swipe. Tapping a row (while the drawer is expanded) SHALL inline-expand it as an accordion showing recordedBy, time, and the full set of actions, without leaving the list. Inline expansion and swipe-reveal SHALL be single-open: tapping or swiping one row SHALL collapse any other row that was expanded or revealed.

#### Scenario: Left-swipe reveals action buttons

- **WHEN** the user left-swipes an entry row
- **THEN** the row SHALL reveal its action buttons

#### Scenario: Tap inline-expands the row in place

- **WHEN** the user taps an entry row while the drawer is expanded
- **THEN** the row SHALL expand in place to show recordedBy, time, and its actions while remaining in the list

#### Scenario: Expanding another row collapses the previous

- **WHEN** one row is inline-expanded and the user taps a different row
- **THEN** the previously expanded row SHALL collapse and only the newly tapped row SHALL remain expanded

### Requirement: Button composition follows the last-entry rule

Action buttons SHALL be composed by the last-entry rule: the latest entry SHALL offer edit and delete; every other entry SHALL offer edit and "roll back and re-record to here". The visible alternative path SHALL replace a disabled delete button for non-latest entries.

#### Scenario: Latest entry exposes edit and delete

- **WHEN** actions are revealed for the latest entry
- **THEN** the buttons SHALL be edit and delete

#### Scenario: Non-latest entry exposes rollback instead of delete

- **WHEN** actions are revealed for an entry that is not the latest
- **THEN** the buttons SHALL be edit and "roll back and re-record to here", and no disabled delete button SHALL be shown

### Requirement: Gesture split while input is in progress

While input is in progress, tapping the Preview SHALL only handle submission (submit when the three steps are complete, no effect otherwise). The handle SHALL toggle the drawer while idle. The in-progress draft SHALL be shown as the Preview itself in a pulsing in-progress style distinct from committed entries — not as a separate row — and on freeze SHALL become the formal first committed entry in place.

#### Scenario: Preview tap during input only submits

- **WHEN** input is in progress and the user taps the Preview with the three steps complete
- **THEN** the system SHALL submit the entry and SHALL NOT expand the drawer

#### Scenario: The in-progress draft is the pulsing Preview, not a duplicate row

- **WHEN** input is in progress
- **THEN** the draft SHALL be shown as the pulsing Preview and SHALL NOT also appear as a separate row, and on freeze it SHALL become the first committed entry in place
