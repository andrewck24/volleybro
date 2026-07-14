## ADDED Requirements

### Requirement: Three distinct background layers

The application SHALL define three background surface layers, each with a distinct color value in both light and dark themes, ordered by elevation where a higher layer is lighter than the layer beneath it in light theme and the ordering is inverted in dark theme.

- Layer 0 (page) SHALL be the `--background` token.
- Layer 0.5 (non-overlay floating surfaces) SHALL be the `--popover` token.
- Layer 1 (cards and items) SHALL be the `--card` token.

No two of `--background`, `--popover`, and `--card` SHALL share the same color value within a single theme.

#### Scenario: Layers are visually separable

- **WHEN** the page body, a non-overlay floating surface (e.g., Popover), and a card are rendered together in either theme
- **THEN** each presents a different background color, and a card placed on any of these surfaces is distinguishable from that surface

#### Scenario: Overlay-backed surfaces share the page layer

- **WHEN** a Dialog or AlertDialog is open
- **THEN** its content surface renders on the `--background` token, identical to the page body, and the dimming overlay — not a distinct surface color — separates it visually from the page behind

##### Example: Lightness ordering

| Token | Layer | dark lightness | light lightness |
| --- | --- | --- | --- |
| `--background` | 0 | darkest | darkest |
| `--popover` | 0.5 | middle | middle |
| `--card` | 1 | lightest | lightest |

### Requirement: Background tokens carry their semantic role

The page `body` background SHALL use the `--background` token (`bg-background`), not `--accent`. The `--accent` token SHALL be reserved for hover and highlight states and SHALL NOT be used as a page or surface background.

Components that render their own dimming `Overlay` (Dialog, AlertDialog) SHALL render their content surface on the `--background` token — the overlay, not a distinct surface color, separates them from the page behind. Floating surface components without a dimming overlay (Popover, Select content) SHALL render on the `--popover` token.

#### Scenario: Body uses background token

- **WHEN** the application shell renders
- **THEN** the `body` element's background resolves to `--background`, and no page-level container relies on `--accent` for its base surface

#### Scenario: Card requires no dialog-specific suppression

- **WHEN** a `<Card>` component is rendered inside a Dialog
- **THEN** it appears raised above the dialog surface using its standard ring and shadow, without any dialog-scoped CSS rule that strips its ring or shadow
