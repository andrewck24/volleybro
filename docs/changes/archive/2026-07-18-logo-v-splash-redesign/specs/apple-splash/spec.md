## MODIFIED Requirements

### Requirement: V mark composition

The launch screen SHALL render the "V" mark as two filled SVG path arms taken from the shared brand-mark geometry constants (the Saira Stencil lowercase `v` at the brand weight, scaled to cap height), plus the full VolleyBro wordmark (logo-type geometry from the same constants) centered horizontally near the bottom, independent of any external image asset or runtime font dependency.

#### Scenario: Mark colors and shape

- **WHEN** the launch screen is rendered
- **THEN** the left arm of the "V" SHALL be filled with `#F6F4F5` and the right arm SHALL be filled with `#FC7A56`
- **AND** the mark's SVG paths and viewBox SHALL be imported from the brand components module, not declared in the route
- **AND** the mark SVG SHALL be centered and sized to 25% of the shorter device dimension
- **AND** the wordmark SHALL be rendered centered horizontally at 40% of the shorter device dimension wide, with its bottom edge inset 6% of the screen height from the bottom, neutral parts ivory and right arm coral
