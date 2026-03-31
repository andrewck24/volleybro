# Architecture

## Component Organization

Components are organized into three layers with distinct responsibilities and boundary rules.

| Layer       | Location                            | Domain Knowledge                               | Examples                    |
| ----------- | ----------------------------------- | ---------------------------------------------- | --------------------------- |
| `ui/`       | `src/components/ui/`                | None — zero business logic                     | Button, Card, Dialog, Item  |
| `custom/`   | `src/components/custom/`            | Allowed — Next.js Link, app hooks, data-testid | Court                       |
| `{domain}/` | `src/components/{team,record,...}/` | Full domain context                            | LineupPanel, InvitationList |

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

This document is iteratively expanded by each change that introduces architectural decisions.
