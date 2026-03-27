# Architecture

## Component Organization

Components are organized into three layers with distinct responsibilities and boundary rules.

| Layer       | Location                            | Domain Knowledge                               | Examples                                              |
| ----------- | ----------------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| `ui/`       | `src/components/ui/`                | None — zero business logic                     | Button, Card, Badge, Dialog, Item                     |
| `custom/`   | `src/components/custom/`            | Allowed — Next.js Link, app hooks, data-testid | `list-item/person-item`, `list-item/team-item`, Court |
| `{domain}/` | `src/components/{team,record,...}/` | Full domain context                            | LineupPanel, InvitationList                           |

**Rule of thumb**: Could be published as a generic npm package → `ui/`. Reused across 2+ domain folders with app-specific behavior → `custom/`. Used in only one domain → `{domain}/`.

### Subdirectory Grouping

When multiple related wrappers belong to the same concept, group them under a subdirectory:

- `custom/list-item/` — Item wrappers: `person-item.tsx`, `team-item.tsx`
- Tests mirror the same structure: `custom/__tests__/list-item/`

### Testing Conventions

- Use `data-testid` (kebab-case) when structural queries are needed in tests — do not use `container.querySelector` or direct DOM access
- Use `getByRole`, `getByText`, `getByTestId` from Testing Library for all assertions
- Use `<Link />` from `next/link` in tests instead of `<a>` elements to satisfy `@next/next/no-html-link-for-pages`
- New components and skeletons should add `data-testid` markers to testable structural elements on creation

This document is iteratively expanded by each change that introduces architectural decisions.
