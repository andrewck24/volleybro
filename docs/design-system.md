# VolleyBro Design System

## Color Tokens

### Brand Colors

| Token         | Light                | Dark | Usage                                      |
| ------------- | -------------------- | ---- | ------------------------------------------ |
| `primary`     | `hsl(192, 77%, 28%)` | same | Brand teal - buttons, links, active states |
| `destructive` | `hsl(13, 97%, 66%)`  | same | Error, delete, danger actions              |

### Feedback Colors

| Token     | Light                | Dark                 | Usage                               |
| --------- | -------------------- | -------------------- | ----------------------------------- |
| `success` | `hsl(152, 60%, 36%)` | `hsl(152, 55%, 45%)` | Confirmation, save complete, online |
| `warning` | `hsl(38, 92%, 50%)`  | `hsl(38, 90%, 55%)`  | Attention needed, near limit        |
| `info`    | `hsl(210, 70%, 50%)` | `hsl(210, 65%, 55%)` | Neutral tips, guidance              |

### Chart Palette

Derived from brand colors. `chart-1` (primary teal) and `chart-2` (destructive orange) anchor the palette; `chart-3`-`chart-5` extend the hue range.

| Token     | Light                | Dark                 | Role                |
| --------- | -------------------- | -------------------- | ------------------- |
| `chart-1` | `hsl(192, 77%, 28%)` | `hsl(192, 70%, 45%)` | Primary data series |
| `chart-2` | `hsl(13, 97%, 66%)`  | `hsl(13, 90%, 70%)`  | Contrast/secondary  |
| `chart-3` | `hsl(210, 65%, 45%)` | `hsl(210, 60%, 55%)` | Cool extension      |
| `chart-4` | `hsl(38, 92%, 50%)`  | `hsl(38, 85%, 60%)`  | Warm extension      |
| `chart-5` | `hsl(270, 40%, 55%)` | `hsl(270, 45%, 65%)` | Neutral balance     |

Usage in code:

```tsx
import { chartColors } from "@/lib/design-tokens";

const config: ChartConfig = {
  attacks: { label: "Attacks", color: chartColors[1] },
  errors: { label: "Errors", color: chartColors[2] },
};
```

## Depth, Elevation & Edge Definition

> The rendered source of truth is the blueprint `design-system` section (`/design-system` on the blueprint site) — it renders the real tokens live from `the `:root`/`.dark` token blocks in `src/app/globals.css``. This chapter is the prose companion; if the two disagree, the blueprint wins.

### Three Layers

The app defines three background layers, each a distinct value per theme in `the `:root`/`.dark` token blocks in `src/app/globals.css``, ordered by elevation (lighter = higher in light mode, inverted in dark mode):

| Layer | Token | Role | Light | Dark |
| ----- | ----- | ---- | ----- | ---- |
| 0 | `--background` | Page body only | 95.6% | 4.9% |
| 0.5 | `--popover` | Non-overlay floats — Popover, Select content (future Dropdown/Tooltip) | ~97% | ~10% |
| 1 | `--card` | Card/Item **and every modal-class surface** — Dialog, AlertDialog, Drawer | 98.45% | 14.5% |

Invariant: no two of `--background`, `--popover`, `--card` share a value within a theme.

Modal surfaces (Dialog, AlertDialog, Drawer) render on `--card`, the same token as Card/Item — they do not get their own layer. What separates a modal from the page is its dimming scrim (`bg-black/80`), not a color step. This keeps the system one-toned and, in particular, keeps the Drawer's in-flow "peek" state (visible before any scrim exists) continuous with the page's card surfaces. A `<Card>` rendered inside a modal therefore sits on a same-color surface; it is distinguished from the modal by **shadow**, not by a background step or a ring.

### No-Ring Rule

No container carries a decorative ring/border. Each container kind signals elevation through a different cue:

| Container kind | Example | Depth cue |
| --------------- | ------- | --------- |
| Overlay-backed | Dialog, AlertDialog, Drawer | Dimming scrim (`bg-black/80`) |
| Non-overlay floating | Popover, Select, Dropdown | `--popover` background step + `shadow-md` |
| In-flow | Card, Item | `--card` background step + shadow |

`--ring` remains reserved for **focus-visible states only** — it is not a decorative edge tool. Where a card-class element must sit on a same-color surface (e.g. inside a modal), the compensation cue is **shadow**, never a ring.

### When to keep `border`

- **Semantic separators**: table rows (`border-b`), accordion dividers, tab indicators
- **Active state indicators**: tab bottom line (`border-b-primary`)
- These are content dividers, not container edges

## Concentric Radius

When a rounded container holds another rounded element, the inner radius must be:

```text
inner-radius = outer-radius - padding
```

This creates concentric (parallel) curves. Equal radii on nested elements looks wrong at small gaps.

### Example

```tsx
{/* outer: rounded-xl (12px), padding: p-2 (8px) */}
<div className="rounded-xl p-2">
  {/* inner: 12px - 8px = 4px = rounded */}
  <img className="rounded" />
</div>
```

### Radius Scale Reference

| Class        | Value                   | Use case                           |
| ------------ | ----------------------- | ---------------------------------- |
| `rounded-sm` | 2px (`--radius - 4px`)  | Inner elements in tight containers |
| `rounded-md` | 6px (`--radius - 2px`)  | Default component radius           |
| `rounded-lg` | 8px (`--radius`)        | Cards, dialogs                     |
| `rounded-xl` | 12px (`--radius + 4px`) | Outer wrappers                     |

## Item-First Data Surface

As `Item` gradually replaces table-heavy presentation, preserve scanability on neutral page backgrounds:

- Use `bg-card + shadow-sm + ring-1 ring-transparent` for default row containers.
- Keep separators semantic (`Separator`), not container borders.
- Use inset ring on small inner media blocks (`ItemMedia icon`) to define edges without visual noise.

This keeps list density high while maintaining Schoger-style clean edges and depth.

## Hover State Color Rule

The app body uses `bg-background` as its page background. `accent` is reserved for hover/highlight states and must never be used as a page or surface background.

### Token Lightness Reference (light mode)

| Token        | Lightness | Role                                       |
| ------------ | --------- | ------------------------------------------- |
| `card`       | 98.45%    | Card/Item and modal-class surfaces          |
| `popover`    | ~97%      | Non-overlay floats (Popover, Select)        |
| `background` | 95.6%     | **Page body background**                    |
| `secondary`  | ~93.8%    | Subtle fill                                 |
| `muted`      | ~90.4%    | Hover target token                          |
| `accent`     | ~95.6%    | Hover/highlight only — never a background   |

### Rule

> Hover must **darken** relative to the element's resting state, not dissolve toward the background.

| Context                                    | Resting bg               | Correct hover         | Forbidden                              |
| ------------------------------------------- | ------------------------- | ---------------------- | -------------------------------------- |
| On body (`bg-background`)                   | `bg-card` / transparent   | `hover:bg-muted/50`   | `hover:bg-accent`, `hover:bg-accent/*` |
| Inside a card-class surface (Card, Dialog)  | `bg-card`                  | `hover:bg-accent/30`  | `hover:bg-accent` (full)               |
| Ghost / outline button on body              | transparent                | `hover:bg-muted/50`   | `hover:bg-accent`                      |
| Active/selected state on body               | transparent                | `bg-muted/60`         | `bg-accent/80`                         |

### Applied Components

- `Item` (default, outline variants) - `hover:bg-muted/50` / `hover:bg-muted/40`
- `Button` (outline, ghost variants) - `hover:bg-muted/50`
- `NavLink` active state - `bg-muted/60`
- `AccordionTrigger` on page - `hover:bg-muted/50`

## Button Shape + Height

- Preferred action button shape: medium radius (`rounded-md`), `text-sm`.
- Preferred visual height range: 36-38px (`h-9` baseline).
- Do not use solid borders on elevated button variants; use outer ring so edge + shadow stays clean.
- For components with an `outline` variant, non-outline variants can use transparent ring and rely on shadow for separation.

## Typography

| Font         | Variable              | Usage                         |
| ------------ | --------------------- | ----------------------------- |
| Saira        | `--font-saira`        | Primary - headings, body text |
| Noto Sans TC | `--font-noto-sans-tc` | CJK fallback                  |

## Spacing

Standard Tailwind 4px-base scale. No custom spacing tokens defined beyond the default Tailwind set.
