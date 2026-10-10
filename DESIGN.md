---
name: VolleyBro
description: A calm, clear and efficient sideline recording tool.
colors:
  background: "hsl(230, 20%, 95.6%)"
  foreground: "hsl(0, 0%, 0%)"
  card: "hsl(330, 10%, 98.45%)"
  card-foreground: "hsl(0, 0%, 0%)"
  popover: "hsl(230, 14%, 97%)"
  popover-foreground: "hsl(0, 0%, 0%)"
  primary: "hsl(192, 77.46%, 27.84%)"
  primary-foreground: "hsl(330, 10%, 96.08%)"
  secondary: "hsl(230, 18%, 93.8%)"
  secondary-foreground: "hsl(0, 2.04%, 9.61%)"
  muted: "hsl(230, 14%, 90.4%)"
  muted-foreground: "hsl(0, 0%, 38.43%)"
  accent: "hsl(230, 20%, 95.6%)"
  accent-foreground: "hsl(0, 2.04%, 9.61%)"
  court: "hsl(13.01, 96.51%, 66.27%)"
  court-foreground: "hsl(192 70% 8%)"
  court-back-zone: "hsl(12.93, 96.67%, 76.47%)"
  destructive: "hsl(13, 85%, 42%)"
  destructive-foreground: "hsl(330, 10%, 96.08%)"
  destructive-text: "hsl(13, 85%, 42%)"
  away: "hsl(13, 60%, 40%)"
  away-foreground: "hsl(330, 10%, 96.08%)"
  away-text: "hsl(13, 60%, 40%)"
  error: "hsl(13, 60%, 40%)"
  error-foreground: "hsl(330, 10%, 96.08%)"
  error-text: "hsl(13, 60%, 40%)"
  primary-text: "hsl(192, 77.46%, 27.84%)"
  success: "hsl(152, 60%, 36%)"
  success-foreground: "hsl(330, 10%, 96.08%)"
  warning: "hsl(38, 92%, 50%)"
  warning-foreground: "hsl(0, 0%, 0%)"
  info: "hsl(210, 70%, 50%)"
  info-foreground: "hsl(330, 10%, 96.08%)"
  border: "hsl(230, 14%, 88.2%)"
  input: "hsl(230, 14%, 88.2%)"
  ring: "hsl(230, 16%, 86.5%)"
  chart-1: "hsl(192, 77%, 28%)"
  chart-2: "hsl(13, 97%, 66%)"
  chart-3: "hsl(210, 65%, 45%)"
  chart-4: "hsl(38, 92%, 50%)"
  chart-5: "hsl(270, 40%, 55%)"
  dark-background: "hsl(217.2, 84%, 4.9%)"
  dark-foreground: "hsl(217.2, 10%, 96.08%)"
  dark-card: "hsl(217.2, 20.6%, 14.5%)"
  dark-card-foreground: "hsl(330, 10%, 96.08%)"
  dark-popover: "hsl(217.2, 28%, 10%)"
  dark-popover-foreground: "hsl(330, 10%, 96.08%)"
  dark-primary: "hsl(192, 77.46%, 27.84%)"
  dark-primary-foreground: "hsl(330, 10%, 96.08%)"
  dark-secondary: "hsl(217.2, 32.6%, 27.5%)"
  dark-secondary-foreground: "hsl(330, 10%, 96.08%)"
  dark-muted: "hsl(217.2, 10.6%, 32%)"
  dark-muted-foreground: "hsl(215, 20.2%, 78%)"
  dark-accent: "hsl(192, 5%, 5.5%)"
  dark-accent-foreground: "hsl(330, 10%, 96.08%)"
  dark-destructive-text: "hsl(13.01, 96.51%, 66.27%)"
  dark-away-text: "hsl(13.01, 96.51%, 66.27%)"
  dark-error-text: "hsl(13.01, 96.51%, 66.27%)"
  dark-primary-text: "hsl(192, 70%, 50%)"
  dark-success: "hsl(152, 55%, 45%)"
  dark-success-foreground: "hsl(217.2, 10%, 96.08%)"
  dark-warning: "hsl(38, 90%, 55%)"
  dark-warning-foreground: "hsl(0, 0%, 0%)"
  dark-info: "hsl(210, 65%, 55%)"
  dark-info-foreground: "hsl(217.2, 10%, 96.08%)"
  dark-border: "hsl(217.2, 32.6%, 30.5%)"
  dark-input: "hsl(217.2, 32.6%, 27.5%)"
  dark-ring: "hsl(212.7, 26.8%, 83.9%)"
  dark-chart-1: "hsl(192, 70%, 45%)"
  dark-chart-2: "hsl(13, 90%, 70%)"
  dark-chart-3: "hsl(210, 60%, 55%)"
  dark-chart-4: "hsl(38, 85%, 60%)"
  dark-chart-5: "hsl(270, 45%, 65%)"
typography:
  display:
    fontFamily: Saira, Noto Sans TC, sans-serif
    fontSize: 3rem
    fontWeight: 700
  heading:
    fontFamily: Saira, Noto Sans TC, sans-serif
    fontSize: 1.25rem
    fontWeight: 600
  body:
    fontFamily: Saira, Noto Sans TC, sans-serif
    fontSize: 1rem
    fontWeight: 400
  label:
    fontFamily: Saira, Noto Sans TC, sans-serif
    fontSize: 0.875rem
    fontWeight: 500
  meta:
    fontFamily: Saira, Noto Sans TC, sans-serif
    fontSize: 0.75rem
    fontWeight: 400
rounded:
  sm: 4px
  md: 6px
  lg: 0.5rem
  xl: 12px
spacing:
  base: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    typography: "{typography.label}"
    height: 2.25rem
    padding: 0.5rem 0.875rem
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    rounded: "{rounded.md}"
    height: 2.25rem
    padding: 0.5rem 0.875rem
  button-court:
    backgroundColor: "{colors.court}"
    textColor: "{colors.court-foreground}"
    rounded: "{rounded.md}"
    height: 2.25rem
    padding: 0.5rem 0.875rem
  input:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: 2.25rem
    padding: 0.25rem 0.75rem
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: 0.5rem 1rem
  chip:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.md}"
    padding: 0.125rem 0.5rem
  navigation:
    backgroundColor: "{colors.background}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.md}"
---

# Design System: VolleyBro

## Overview

**Creative North Star: "The Calm Sideline Tool"**

**Key Characteristics:**

- Calm
- Clear
- Efficient

Calm, clear and efficient. A recorder works one-handed with divided attention; scores and the next action lead, while supporting detail stays quiet. Teal anchors the interface and coral makes the court recognisable. Tonal surfaces, restrained shadows and compact, legible controls keep the hierarchy clear.

This file is the authoritative design entry point. Keep it self-contained while it stays concise. Introduce a supplement only when a topic creates a meaningful reading burden and can be read independently; list its path, scope and reading trigger here. No supplements are currently required. Read the relevant sections for the task; Landing's narrative and composition belong in its [surface brief](.impeccable/surfaces/src-app-page-tsx.md).

Frontmatter holds normative tokens. Unprefixed colors map to light-mode CSS properties; a `dark-` prefix supplies a dark-mode override, with unlisted colors inherited from light. Alias colors are resolved to their concrete HSL value for portable tools. Runtime values live in `src/app/globals.css`; a consistency check requires both representations to agree. Blueprint renders this document and live samples; it never owns separate rules.

`.impeccable/design.json` is a committed, generated extension of this document, never edited by hand. YAML blocks in the relevant chapters carry extensions the frontmatter schema cannot represent. Regenerate with `node scripts/design-document.js --write`; verify with `node scripts/design-document.js --check`. Agents normally read this document instead of the generated sidecar.

Apple [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines) inform clarity, hierarchy, accessible interaction and feedback. Apply them gradually when a page is redesigned; they do not authorize a whole-app redesign. SwiftUI correspondences below describe concepts and interaction roles only, not API choices or native implementation.

HIG-informed principles guide usability and accessibility. VolleyBro's token roles, surface layers, radii and component sizes are project policies; they are not Apple requirements. Web performance restrictions apply to custom PWA code, not native system animations. Documenting these principles does not establish that the shipped app meets them; verify each affected surface when applying them.

## Colors

### Brand identity

Teal `primary` is the interface brand color: primary actions, the brand ground and launch splash. Coral `court` is the mark and court color, distinct from danger. The V mark comes from the Saira Stencil One lowercase v: its right arm stays coral; neutral parts use currentColor on light/dark grounds and ivory on teal. The logo-symbol is the V and the logo-type is the VolleyBro wordmark. Geometry and assets live in `src/components/brand/` and `public/brand/`.

### Semantic roles

| Token family                   | Role                                                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| primary / primary-text         | Interface teal; text and icons use the text variant, brighter in dark mode                                                 |
| court / court-foreground       | Brand coral court, V mark, opponent statistics bar, libero badge and selected opponent move; near-black teal text on coral |
| court-back-zone                | Lighter coral back zone of the recording court                                                                             |
| destructive / destructive-text | Vivid red for danger actions and danger-zone headings only                                                                 |
| away / away-text               | Muted red for opponent, loss and leaving; a substitution OUT means leaving the court, paired with the teal IN arrow        |
| error / error-text             | Muted red for errors; Alert and Toast use a faint error background and error text                                          |
| success / warning / info       | Confirmation / caution / neutral information                                                                               |
| chart-1 … chart-5              | Teal and coral anchor a palette extended by blue, amber and violet                                                         |
| foreground / muted-foreground  | Main / supporting text                                                                                                     |
| border / input                 | Semantic separators / control edges                                                                                        |
| ring                           | Focus-visible states only                                                                                                  |

Away and error share a value today but remain separate semantic tokens. Use text variants on cards and neutral surfaces; use the paired foreground on a filled semantic surface. `court-foreground` on `court` reaches 6.67:1; near-white on coral fails AA, so never substitute `destructive-foreground`. Target at least 4.5:1 for normal text and 3:1 for meaningful icons; the executable contrast check guards the adopted pairs, not every possible feedback or chart pairing.

Charts use `chartColors` from `src/lib/design-tokens`; the numeric keys map to the chart token family rather than literal colors.

Following HIG [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), never communicate a score outcome, selection, error or substitution direction through color alone. Pair color with a visible label, icon or shape, and expose its meaning to assistive technology. Token separation does not replace these cues.

## Typography

Saira is the primary Latin heading/body face; Noto Sans TC is the CJK fallback in `--font-sans`. Saira Stencil One is reserved for the existing V mark. Use semantic roles and the Tailwind rem scale, never arbitrary `text-[Npx]` literals.

The floor is `text-xs` (0.75rem); body and description copy is at least `text-sm`. Text directly on court or free-zone surfaces is at least `text-base`. Reserve `text-xs` for badges, meta labels and the Beta mark. App components retain their context-specific sizes. A digit in a fixed-size badge may be smaller only when the same number appears elsewhere.

Following HIG [Typography](https://developer.apple.com/design/human-interface-guidelines/typography) and [Layout](https://developer.apple.com/design/human-interface-guidelines/layout), support text enlargement and adaptive layout. For the PWA, verify text at 200% enlargement: content and controls must remain readable and operable without clipping or overlap; rows may grow and horizontal groups may stack. Do not disable browser zoom. A repeated badge value does not waive legibility or resizing checks. Native correspondence is semantic text styles and Dynamic Type, not a CSS-pixel-to-point conversion.

| Role            | Tailwind specimen                                            |
| --------------- | ------------------------------------------------------------ |
| display / score | text-5xl font-bold; scores use tabular-nums and leading-none |
| stat-figure     | text-3xl font-bold tabular-nums                              |
| heading         | text-xl font-semibold                                        |
| subheading      | text-lg font-medium                                          |
| entry           | text-2xl font-medium tabular-nums                            |
| body            | text-base font-normal                                        |
| label           | text-sm font-medium                                          |
| meta            | text-xs text-muted-foreground                                |

The specimens demonstrate the current scale; the frontmatter captures its reusable primitives. SwiftUI correspondence: semantic text styles, readable secondary labels and stable-width score digits.

## Layout

The phone at the sideline is the reference device, followed by the laptop after a match. Preserve scanability in dense recording and list surfaces. Spacing follows Tailwind's 0.25rem base; use numeric utilities such as `p-2`, `gap-4` and `pb-21`, rather than arbitrary pixel spacing. Safe-area or computed layout expressions remain valid when a numeric utility cannot represent them.

Common app specimens include court/panel gaps (`gap-1` / `gap-2`), the drawer peek reservation (`pb-21`) and the fixed-header reservation plus safe area. These are examples, not new global spacing tokens. SwiftUI correspondence: layout spacing, safe-area handling and adaptive layouts.

### Breakpoints

These are the existing Tailwind defaults, not a new application-specific scale.

```yaml
breakpoints:
  - { name: sm, value: 40rem }
  - { name: md, value: 48rem }
  - { name: lg, value: 64rem }
  - { name: xl, value: 80rem }
  - { name: 2xl, value: 96rem }
```

## Elevation & Depth

Three distinct tonal layers express depth; no two share a value within a theme. Light surfaces become lighter as they rise; dark surfaces also rise toward lighter values.

| Layer | Token      | Role                                                                     |
| ----- | ---------- | ------------------------------------------------------------------------ |
| 0     | background | Page body only                                                           |
| 0.5   | popover    | Non-overlay floats: Popover, Select, Dropdown and Tooltip                |
| 1     | card       | Card, Item and every modal-class surface: Dialog, AlertDialog and Drawer |

All modal surfaces use `card`; the `bg-black/80` dimming scrim separates them from the page, keeping a Drawer's in-flow peek continuous with card surfaces. A Card inside a modal is separated by shadow, not another background layer.

### No-Ring scope

The rule governs container elevation only: do not convey depth with a decorative ring or border. Overlay-backed surfaces use the scrim; non-overlay floats use the popover step plus `shadow-md`; in-flow Card/Item surfaces use the card step and shadow. Same-color nested containers use shadow, never a decorative ring.

Ring-instead-of-border is a formal edge technique for controls and small media. Semantic-color rings may express selected or invalid states; `--ring` stays reserved for focus-visible. Keep semantic borders for table rows, accordion separators and tab indicators. They divide content or indicate state; they do not create container elevation.

Following HIG [Materials](https://developer.apple.com/design/human-interface-guidelines/materials), preserve readable foregrounds when transparency is reduced or contrast is increased. Where the browser exposes these preferences, adapt glass and translucent surfaces; provide a sufficiently opaque fallback and stronger separation when needed. Verify against the underlying content in both themes. Functional edges needed for accessibility take precedence over decorative No-Ring styling. These are requirements for affected surfaces, not claims that existing CSS already handles every preference.

### Shadows

```yaml
shadows:
  - name: shadow-sm
    value: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)"
    purpose: In-flow card and action separation.
  - name: shadow-md
    value: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
    purpose: Non-overlay floating surfaces.
```

SwiftUI correspondence: layered backgrounds, floating controls and modal presentation. PWA status bar, body-backdrop and launch-splash behavior belong to the [PWA Feature](blueprint/content/features/platform/pwa/index.mdx), not to another surface layer.

## Shapes

Use concentric corners: `inner-radius = outer-radius - padding`. Equal radii on tightly nested elements produce mismatched curves. For example, `rounded-xl` (12px) with `p-2` (8px) needs a 4px inner radius (`rounded-sm`). The base is `--radius: 0.5rem`; sm/md/lg/xl subtract 4px, subtract 2px, retain the base, or add 4px respectively. At a 16px root, sm is 4px.

Incumbent Landing examples: header shell 16/6/10, theme switcher 10/4/6, entry card 12/6/6, demo tray 20/8/12, stats slide 16/8/8 or 24/16/8 (outer/padding/inner in px). The current Drawer uses 10px top corners. These are incumbent examples, not a universal shape rule.

## Components

### Buttons and controls

Actions use medium radius (`rounded-md`) and a clear label. The current default visual height is `h-9` (36px), within the existing 36–38px baseline. Elevated variants use an outer ring rather than a solid border; non-outline variants may use a transparent ring and shadow.

**Adopted sizing rules; implementation is pending the button-size delivery shard:**

| Context                              | Size / rule                                                             |
| ------------------------------------ | ----------------------------------------------------------------------- |
| Page primary action and form submit  | lg                                                                      |
| In-section action and dialog footer  | default                                                                 |
| List-row action                      | wide                                                                    |
| Header/back/close icon control       | 44×44 CSS px for touch; 36 under pointer: fine; no outline, glass shell |
| Back / close glyph                   | RiArrowLeftSLine / RiCloseLine                                          |
| Chips                                | Segmented chip treatment with a 44px hit area                           |
| Recording move buttons               | Known exception; measure before deciding                                |
| Navigation FAB and Landing CTAButton | Own their sizes                                                         |

Frontmatter component samples describe the shipped default primitives, not the pending icon/chip changes. Glass belongs to floating controls; this does not require a whole-app glass redesign. HIG motivates the touch-target rule; CSS px are the web project's units, not native points. SwiftUI correspondence: primary actions, toolbar controls, dismiss actions and segmented selection.

### Item-first data surfaces

Prefer Item composition for scannable data rows: `bg-card + shadow-sm + ring-1 ring-transparent`. Use semantic Separator elements between content. Small ItemMedia blocks may use an inset ring to define their edges. Keep fetching and loading ownership in the component that owns the data; the [Components Feature](blueprint/content/features/platform/design-system/components/index.mdx) documents behavioral composition.

### Hover and states

`background` is the page plane; `accent` is hover/highlight only. Hover must darken relative to rest rather than dissolve into the page background.

| Context                     | Rest                | Hover / selected   | Avoid                                      |
| --------------------------- | ------------------- | ------------------ | ------------------------------------------ |
| On body                     | card or transparent | hover:bg-muted/50  | hover:bg-accent or accent opacity variants |
| Inside card/modal           | card                | hover:bg-accent/30 | full hover:bg-accent                       |
| Ghost/outline on body       | transparent         | hover:bg-muted/50  | hover:bg-accent                            |
| Selected navigation on body | transparent         | bg-muted/60        | bg-accent/80                               |

Item uses muted/50 or muted/40; outline/ghost Button and AccordionTrigger use muted/50; active NavLink uses muted/60. Inputs keep a clear focus-visible ring and error feedback; never remove keyboard focus to satisfy No-Ring. Navigation keeps active and inactive states distinguishable. SwiftUI correspondence: input focus, validation feedback and selection state.

## Do's and Don'ts

Follow Apple HIG for hierarchy, feedback and accessibility when applying these rules. VolleyBro's token and delivery choices remain project-specific. Web animation restrictions concern custom PWA implementation only; native implementations follow their platform guidance.

### Do

- Do prioritise the score and next action over decoration; see [Layout](https://developer.apple.com/design/human-interface-guidelines/layout).
- Do use semantic color pairs, verify contrast in both themes and provide non-color cues.
- Do support text enlargement and readable materials, including reduced-transparency and increased-contrast preferences.
- Do respect reduced motion by showing the static end state. HIG [Motion](https://developer.apple.com/design/human-interface-guidelines/motion) also permits suitable fades; VolleyBro adopts the stricter default.
- Do adopt HIG gradually as a page is redesigned.
- Do keep route-specific strategy in its surface brief.

### Don't

- Don't animate layout properties; custom PWA motion uses transform and opacity only.
- Don't reuse the `destructive` token family for opponent data or errors; this does not prohibit red error feedback.
- Don't add a decorative container ring to express elevation; preserve functional accessibility edges and keyboard focus.
- Don't use `accent` as a page or resting surface background.
- Don't present the pending button-size rules as already implemented.

### Motion extensions

These values belong to Landing only; they do not create global app motion tokens. Existing noncompliant layout/color transitions are not silently repaired by this document migration.

```yaml
motion:
  - name: landing-entry-transform
    value: 500ms
    purpose: Landing entry-row transform; landing scope only.
  - name: ease-landing
    value: cubic-bezier(0.2, 0.8, 0.2, 1)
    purpose: Landing easing; landing scope only.
```
