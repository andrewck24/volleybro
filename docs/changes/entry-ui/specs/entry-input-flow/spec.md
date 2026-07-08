## ADDED Requirements

### Requirement: Three-step segmented progress bar navigation

The entry input panel SHALL present a three-step extending segmented progress bar (player → home team → away team) at the panel's top edge. The active segment SHALL extend; segments SHALL carry no inline text; a single caption below the bar SHALL describe the active step and rotate with animation on step change. The user SHALL switch steps by tapping a progress segment or by pointer swipe. A step whose predecessor is incomplete SHALL NOT be reachable.

#### Scenario: Advance blocked until previous step complete

- **WHEN** the user attempts to move to the home-team step while the player step has no selection
- **THEN** the system SHALL keep the active step on player and SHALL NOT advance

#### Scenario: Tap and swipe both switch a reachable step

- **WHEN** the player step is complete and the user taps the home-team segment or swipes toward it
- **THEN** the system SHALL make the home-team step active and rotate the caption to describe it

### Requirement: Away-team error collapses the flow to a single step

When the recorded point is an away-team error (a point won or lost by the opponent), the flow SHALL collapse to a single step that is immediately submittable.

#### Scenario: Away error yields single submittable step

- **WHEN** the user selects an away-team error at the away-team step
- **THEN** the progress bar SHALL collapse to a single step and the entry SHALL become submittable without further steps

### Requirement: Preview carries submission with completion highlight

Submission SHALL be centralized in the Preview, which SHALL follow the Entry layout with score Figures in three states: idle shows the previous entry; while the outcome is undecided the current score is muted; once decided the resulting score colors the winning side. The Preview SHALL pulse while input is in progress, SHALL show a ring plus a send icon only when all steps are complete, and on submit SHALL freeze (background flashes once) with the draft turning in place into the previous entry.

#### Scenario: Send affordance appears only when complete

- **WHEN** input is in progress with at least one step incomplete
- **THEN** the Preview SHALL pulse and SHALL NOT show the ring or send icon

#### Scenario: Submit freezes and demotes the draft

- **WHEN** all steps are complete and the user submits from the Preview
- **THEN** the Preview background SHALL flash once and the draft SHALL become the previous entry in place

### Requirement: Locked controls stay perceivable and swipe suppresses stray taps

Unreachable or locked controls SHALL use aria-disabled rather than the native disabled attribute so they remain focusable and explain their state on interaction. A pointer gesture recognized as a swipe SHALL suppress the click it would otherwise emit.

#### Scenario: Swipe does not trigger a tap

- **WHEN** a pointer interaction on the progress bar is recognized as a swipe
- **THEN** the system SHALL switch the step and SHALL NOT fire the segment's tap handler
