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

Based on Steve Schoger's approach: use CSS `ring` instead of `border` for container edges.

### Why

`border` + `shadow` together creates a muddy transition zone. `ring` (which is a `box-shadow`) composes cleanly with drop shadows.

### Depth & Elevation

The app has two elevation levels relative to the page body (`bg-accent`):

| Level | Context | Shadow | Ring |
| ----- | ------- | ------ | ---- |
| **Level 1** | Directly on body (`bg-accent`) | `shadow-sm` | per variant |
| **Level 2** | Inside Card, Dialog, or other elevated containers | none | per variant |

Shadow presence is the only depth signal. Ring is purely an edge definition tool and is not tied to elevation.

Level 2 shadow suppression is handled globally in `globals.css` via CSS selectors — components do not manage this themselves:

```css
[data-slot="Card"] [data-slot="item"],
[data-slot="DialogContent"] [data-slot="item"] {
  box-shadow: none;
}
```

When adding a new elevated container that can hold `Item`, add its `data-slot` to this selector list.

### Ring Patterns

| Pattern                 | Classes                                | When to use                                             |
| ----------------------- | -------------------------------------- | ------------------------------------------------------- |
| **Outer ring**          | `ring-1 ring-foreground/10`            | Elevated containers with shadow (Card, Dialog, Popover) |
| **Inset ring**          | `ring-1 ring-inset ring-foreground/5`  | Subtle edge on light backgrounds (Alert default)        |
| **Inset ring (input)**  | `ring-1 ring-inset ring-foreground/10` | Form inputs (Input, Select trigger)                     |
| **Interactive surface** | `shadow-sm ring-1 ring-foreground/10`  | Item outline variant — edge visible without shadow      |
| **Shadow-only surface** | `shadow-sm ring-1 ring-transparent`    | Non-outline variants when outline variant exists        |

`ring-foreground/10` adapts automatically: black at 10% in light mode, near-white at 10% in dark mode.

### Applied Components

**Confirmed:**

- `Card` - `shadow-sm ring-1 ring-foreground/10`
- `Header` - `shadow-sm ring-1 ring-foreground/5`
- `Item (default)` - `shadow-sm ring-1 ring-transparent` (shadow suppressed at Level 2 via CSS)
- `Item (outline)` - `shadow-xs ring-1 ring-foreground/10 ring-inset`

**Experimental** (marked with `/* experimental: ring technique */` comments, may revert to `border`):

- `Input`, `Select` (trigger + content), `Popover`, `Dialog`, `Alert`, `Toast`, `Badge` (outline variant)

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

The app body uses `bg-accent` as its page background. Interactive elements placed directly on the body must **not** use `bg-accent` variants for hover or active states - doing so makes the element blend into the background (辨識度降低).

### Token Lightness Reference (light mode)

| Token        | Lightness | Role                       |
| ------------ | --------- | -------------------------- |
| `background` | ~98.5%    | Same as `card` in this app |
| `accent`     | ~95.6%    | **Page body background**   |
| `secondary`  | ~93.8%    | Subtle fill                |
| `muted`      | ~90.4%    | Hover target token         |

### Rule

> Hover must **darken** relative to the element's resting state, not dissolve toward the background.

| Context                                  | Resting bg              | Correct hover        | Forbidden                              |
| ---------------------------------------- | ----------------------- | -------------------- | -------------------------------------- |
| On body (`bg-accent`)                    | `bg-card` / transparent | `hover:bg-muted/50`  | `hover:bg-accent`, `hover:bg-accent/*` |
| Inside elevated container (Card, Dialog) | `bg-card`               | `hover:bg-accent/30` | `hover:bg-accent` (full)               |
| Ghost / outline button on body           | transparent             | `hover:bg-muted/50`  | `hover:bg-accent`                      |
| Active/selected state on body            | transparent             | `bg-muted/60`        | `bg-accent/80`                         |

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
