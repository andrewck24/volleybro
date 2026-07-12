# entry-input-flow Specification

## Purpose

TBD - created by archiving change 'entry-ui'. Update Purpose after archive.

## Requirements

### Requirement: Three-step segmented progress bar navigation

The entry input panel SHALL present a three-step extending segmented progress bar (player → home team → away team) at the panel's top edge. The active segment SHALL extend; segments SHALL carry no inline text; a single caption below the bar SHALL describe the active step and rotate with animation on step change. The user SHALL switch steps by tapping a progress segment or by a horizontal pointer swipe anywhere on the panel — the progress bar track or the moves body. A step whose predecessor is incomplete SHALL NOT be reachable.

#### Scenario: Advance blocked until previous step complete

- **WHEN** the user attempts to move to the home-team step while the player step has no selection
- **THEN** the system SHALL keep the active step on player and SHALL NOT advance

#### Scenario: Tap and swipe both switch a reachable step

- **WHEN** the player step is complete and the user taps the home-team segment or swipes toward it
- **THEN** the system SHALL make the home-team step active and rotate the caption to describe it


<!-- @trace
source: entry-ui
updated: 2026-07-12
code:
  - .markdownlint.jsonc
  - .rtk/filters.toml
  - CLAUDE.md
-->

---
### Requirement: An opponent error collapses the flow to two steps

When the recorded point is an opponent error (OUR recorded move is an unforced/opponent error, so no player is selected), the flow SHALL collapse to two steps — select the opponent error, then confirm the auto-filled outcome — with the outcome step immediately submittable. The collapse SHALL be discriminated by our (home) move being an unforced error, NOT by the away move; our own losing serve or set — whose single outcome auto-fills an unforced away move — SHALL stay on the full three-step flow.

#### Scenario: Opponent error yields a two-step submittable flow

- **WHEN** the user selects an opponent error at the player step
- **THEN** the progress bar SHALL collapse to two steps and the entry SHALL become submittable at the outcome step without a player selection

#### Scenario: Our own losing serve stays on the three-step flow

- **WHEN** the user records a losing serve or set whose outcome auto-fills an unforced away move
- **THEN** the flow SHALL remain three steps and SHALL NOT collapse


<!-- @trace
source: entry-ui
updated: 2026-07-12
code:
  - .markdownlint.jsonc
  - .rtk/filters.toml
  - CLAUDE.md
-->

---
### Requirement: Preview carries submission with completion highlight

Submission SHALL be centralized in the Preview, which SHALL follow the Entry layout with score Figures in three states: idle shows the previous entry; while the outcome is undecided the current score is muted; once decided the resulting score colors the winning side. The Preview SHALL pulse while input is in progress, and only when all steps are complete SHALL it fill the whole entry box with the primary color and show a send icon (in the primary-foreground color) so the Preview reads as a confirm/send button; on submit it SHALL freeze (background flashes once) with the draft turning in place into the previous entry.

#### Scenario: Send affordance appears only when complete

- **WHEN** input is in progress with at least one step incomplete
- **THEN** the Preview SHALL pulse and SHALL NOT fill with the primary color or show the send icon

#### Scenario: Submit freezes and demotes the draft

- **WHEN** all steps are complete and the user submits from the Preview
- **THEN** the Preview background SHALL flash once and the draft SHALL become the previous entry in place


<!-- @trace
source: entry-ui
updated: 2026-07-12
code:
  - .markdownlint.jsonc
  - .rtk/filters.toml
  - CLAUDE.md
-->

---
### Requirement: Completed steps use the primary fill

The progress bar SHALL fill every completed-or-active segment (index at or before the active step) with the primary color and every pending segment with the muted color. The active segment SHALL additionally be rendered wider than the rest.

#### Scenario: Completed step shows the primary fill

- **WHEN** a step is at or before the active step
- **THEN** its segment SHALL be filled with the primary color, not the muted color


<!-- @trace
source: entry-ui
updated: 2026-07-12
code:
  - .markdownlint.jsonc
  - .rtk/filters.toml
  - CLAUDE.md
-->

---
### Requirement: Switching a step updates the recording panel in sync with a directional slide

Switching to a reachable step SHALL change both the highlighted segment and the recording moves panel shown below it from a single source of truth, so the highlight and the shown panel can never disagree. The newly shown panel body SHALL animate in with a directional slide whose direction matches forward versus backward navigation.

#### Scenario: Tapping a reachable step swaps the panel in sync

- **WHEN** the away step is reachable and the user taps or swipes to the home-team segment
- **THEN** the home-team recording moves SHALL be shown and the home-team segment SHALL be marked active together

#### Scenario: Panel body slides directionally on switch

- **WHEN** the active step changes
- **THEN** the newly shown panel body SHALL animate in with a slide whose direction matches forward or backward navigation

#### Scenario: Selecting a player advances and slides to the home step

- **WHEN** the user selects a court player while on the player step
- **THEN** the flow SHALL advance to the home step and the moves body SHALL slide in as a forward step change, even though the underlying panel side does not change


<!-- @trace
source: entry-ui
updated: 2026-07-12
code:
  - .markdownlint.jsonc
  - .rtk/filters.toml
  - CLAUDE.md
-->

---
### Requirement: The recording panel defers labeling to the progress-bar caption

The recording moves panel SHALL NOT render its own per-step titles; the single caption below the progress bar SHALL be the sole label for the active step. The panel SHALL be a plain surface keeping only its background color, gap, and padding — it SHALL NOT be wrapped in card chrome (rounded border, ring, or shadow).

#### Scenario: Moves panel shows no redundant step titles

- **WHEN** a recording moves panel is shown
- **THEN** it SHALL NOT display its own our-team / opponent scoring-record titles


<!-- @trace
source: entry-ui
updated: 2026-07-12
code:
  - .markdownlint.jsonc
  - .rtk/filters.toml
  - CLAUDE.md
-->

---
### Requirement: Submission is not duplicated outside the Preview

The Preview SHALL be the sole submission control. Selecting an away-team move SHALL only record the selection; it SHALL NOT act as a second submit control, and no send affordance SHALL appear on the away move buttons.

#### Scenario: Away move button does not submit

- **WHEN** an away-team move is already selected and the user taps it again
- **THEN** the system SHALL NOT submit the entry and the away move button SHALL show no send icon


<!-- @trace
source: entry-ui
updated: 2026-07-12
code:
  - .markdownlint.jsonc
  - .rtk/filters.toml
  - CLAUDE.md
-->

---
### Requirement: The recording surface fits a single viewport

The recording surface SHALL occupy exactly the visible viewport height as one stacked column — a fixed-height header, the court at its fixed aspect, the recording panel taking the remaining height, and the drawer's idle peek at a fixed height — with the header's height reserved exactly once. The recording moves list SHALL scroll within the panel; it SHALL NOT overflow onto the drawer peek or push the layout past the viewport.

#### Scenario: Long move list scrolls inside the panel

- **WHEN** the recording moves list is taller than the space the panel is given
- **THEN** the list SHALL scroll within the panel and SHALL NOT overlap the drawer peek or extend the layout beyond the viewport


<!-- @trace
source: entry-ui
updated: 2026-07-12
code:
  - .markdownlint.jsonc
  - .rtk/filters.toml
  - CLAUDE.md
-->

---
### Requirement: A failed submission is recoverable, not destructive

When a rally submission fails, the system SHALL surface the error (a toast) without crashing, SHALL roll the optimistic game state back to its prior value rather than leaving it undefined, and SHALL keep the draft in place so the user can retry. The draft SHALL be confirmed only after the server persists it.

#### Scenario: Submission failure surfaces an error and preserves the draft

- **WHEN** a rally submission request fails
- **THEN** the system SHALL show an error, SHALL restore the previous game state, and SHALL keep the unconfirmed draft available for retry


<!-- @trace
source: entry-ui
updated: 2026-07-12
code:
  - .markdownlint.jsonc
  - .rtk/filters.toml
  - CLAUDE.md
-->

---
### Requirement: Locked controls stay perceivable and swipe suppresses stray taps

Unreachable or locked controls SHALL use aria-disabled rather than the native disabled attribute so they remain focusable and explain their state on interaction. A pointer gesture recognized as a swipe SHALL suppress the click it would otherwise emit.

#### Scenario: Swipe does not trigger a tap

- **WHEN** a pointer interaction on the progress bar is recognized as a swipe
- **THEN** the system SHALL switch the step and SHALL NOT fire the segment's tap handler

<!-- @trace
source: entry-ui
updated: 2026-07-12
code:
  - .markdownlint.jsonc
  - .rtk/filters.toml
  - CLAUDE.md
-->