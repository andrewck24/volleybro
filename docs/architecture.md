# Architecture

See also: [Testing Strategy](./testing-strategy.md) · [Contributing Guide](../CONTRIBUTING.md)

## Component Organization

Components are organized into three layers with distinct responsibilities and boundary rules.

| Layer       | Location                            | Domain Knowledge                               | Examples                    |
| ----------- | ----------------------------------- | ---------------------------------------------- | --------------------------- |
| `ui/`       | `src/components/ui/`                | None — zero business logic                     | Button, Card, Dialog, Item  |
| `custom/`   | `src/components/custom/`            | Allowed — Next.js Link, app hooks, data-testid | Court                       |
| `{domain}/` | `src/components/{team,game,...}/`   | Full domain context                            | LineupPanel, InvitationList |

**Rule of thumb**: Could be published as a generic npm package → `ui/`. Reused across 2+ domain folders with app-specific behavior → `custom/`. Used in only one domain → `{domain}/`.

### Item Composition Rule

When a view needs list-row presentation, prefer composing `ui/item` primitives directly in the domain component instead of adding thin wrappers in `custom/`.

- Shared visual building blocks belong in `ui/item.tsx` when they are domain-agnostic, such as `ItemAvatar`
- Data-fetching and loading states stay in the domain component that owns the query, even if this duplicates a small amount of layout code across consumers

### Item Interaction Forms

Use one of these explicit interaction forms when composing an item:

- `Item asChild` for fully navigable rows, where the interactive root is the `Link` or `Button`
- Plain `Item` plus `ItemActions` or `ItemFooter` for static rows with inline actions
- Overlay-link rows for mixed cases like invitations, where the row should navigate but inline buttons must stay clickable

For the overlay-link form, the contract is:

- The navigation link is an absolutely positioned sibling inside the `Item` with `absolute inset-0 z-0`
- Any inline action container must opt out of the overlay by using a higher stacking context such as `relative z-10`
- This pattern is reserved for cases where the whole row should navigate except a small set of inline controls

### Testing Conventions

- Use `data-testid` (kebab-case) when structural queries are needed in tests — do not use `container.querySelector` or direct DOM access
- Use `getByRole`, `getByText`, `getByTestId` from Testing Library for all assertions
- Use `<Link />` from `next/link` in tests instead of `<a>` elements to satisfy `@next/next/no-html-link-for-pages`
- New components and skeletons should add `data-testid` markers to testable structural elements on creation

For full testing conventions per Clean Architecture layer, see [docs/testing-strategy.md](./testing-strategy.md).

### Button Loading Props

`ui/button.tsx` accepts `loading?: boolean` and `loadingText?: string`:

- When `loading` is `true`: button is auto-disabled, a `RiLoader4Line animate-spin` spinner is prepended, `aria-busy="true"` is set, and text is replaced with `loadingText` if provided.
- `loading` is ignored when `asChild` is true (the Slot renders a child element, so spinner injection doesn't apply).

### Submitting State Pattern

For async button actions, manage loading feedback locally — no global loading context:

1. Add `const [isSubmitting, setIsSubmitting] = useState(false)` in the component
2. Wrap the async handler with `setIsSubmitting(true)` / `setIsSubmitting(false)` in try/finally
3. Pass `loading={isSubmitting}` (and optionally `loadingText`) to the `Button`

For components with multiple independent action buttons (e.g., accept/reject), use a `processingId` pattern instead: `loading={processingId === id}` + `disabled={processingId !== null}`.

### Co-located Skeleton Pattern

Each component that has a loading state exports a co-located `*Skeleton` named function from the same file. Generic skeletons (e.g., `LoadingCard`) are not used — each skeleton structurally mirrors its real component.

**Structural Fidelity Standard**:

1. **Same wrapper** — use the same top-level container (`Item`, `Card`, etc.)
2. **Same structural slots** — use the same slot components (`ItemHeader`/`ItemContent`/`ItemFooter`, `CardHeader`, etc.) with identical className props
3. **Per-content `Skeleton`** — each `<Skeleton>` corresponds to one specific piece of real content; no "one blob per section"
4. **Height + `my-*` alignment** — Tailwind `text-*` adds line-height space around the visual glyph; match `Skeleton` height to glyph height (e.g., `h-6` for `text-xl`) and add `my-*` equal to the leading offset (e.g., `my-1`)
5. **Approximate real widths** — `Skeleton` width should approximate the rendered width of the real element
6. **`hover:bg-transparent` on interactive slots** — when a skeleton uses an `Item` or other interactive container, add `hover:bg-transparent` to suppress the hover state

### Empty State Primitive

Use `src/components/ui/empty.tsx` for "not found" and empty list fallbacks instead of raw text. Composable slots: `Empty`, `EmptyHeader`, `EmptyMedia` (`icon`/`default` variants), `EmptyTitle`, `EmptyDescription`, `EmptyContent`.

This document is iteratively expanded by each change that introduces architectural decisions.
