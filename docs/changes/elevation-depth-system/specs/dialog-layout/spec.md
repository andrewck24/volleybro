## ADDED Requirements

### Requirement: Three-section dialog structure

`DialogContent` SHALL carry no padding, SHALL be `overflow-hidden`, SHALL render on the `--background` surface (matching the page layer, separated visually by the dimming overlay), and SHALL lay out its children as a vertical flex column. Content SHALL be organized into three sections — `DialogHeader`, `DialogBody`, and `DialogFooter` — each owning its own padding. `DialogBody` SHALL be the sole scroll container within a dialog.

#### Scenario: Scrollbar sits at the window edge

- **WHEN** a dialog's content exceeds the available height on a desktop viewport
- **THEN** scrolling occurs within `DialogBody` and the scrollbar is flush against the dialog window edge, because `DialogContent` itself does not scroll

#### Scenario: Sections own their spacing

- **WHEN** a dialog renders a header, body, and footer
- **THEN** padding is supplied by each section, and `DialogContent` contributes no padding or gap of its own

### Requirement: Unified close and expand controls

`DialogContent` SHALL render a single control group positioned `absolute` at `top-3 right-3` containing, when enabled, an expand button and a close button, each sized `size-8`. The close button SHALL be present by default and SHALL be controllable via a `closeButton` prop. An expand action SHALL be enabled by providing an `onExpand` callback, with an accessible label configurable via `expandLabel`. Individual dialog headers SHALL NOT hand-roll their own close or expand buttons. `DialogHeader` SHALL reserve horizontal space (`pr-20`) so a long title wraps to the left of the control group rather than beneath it.

#### Scenario: Consistent control geometry

- **WHEN** any two dialogs that expose close and/or expand controls are compared
- **THEN** the controls appear at the same position (`top-3 right-3`) and the same size (`size-8`)

#### Scenario: Close routes through dialog open state

- **WHEN** the user activates the built-in close button on the edit dialog while the form is dirty
- **THEN** the close request propagates through the dialog's `onOpenChange(false)` handler and triggers the unsaved-changes discard confirmation

### Requirement: Accessible description without warnings

Every `DialogContent` SHALL include a `DialogTitle` and a `DialogDescription`. When no visible description is appropriate, the description SHALL be hidden via an `srOnly` prop on `DialogTitle`/`DialogDescription` rather than via ad-hoc `className="sr-only"` or `aria-describedby={undefined}`. Rendered dialogs SHALL produce no Radix "Missing Description" or `aria-describedby` console warning.

#### Scenario: Hidden description satisfies a11y

- **WHEN** a dialog has no visible description and uses `DialogDescription` with `srOnly`
- **THEN** the description is available to assistive technology, is visually hidden, and no accessibility warning is emitted
