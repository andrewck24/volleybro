## Context

The codebase has inconsistent loading/submitting feedback. Some components (e.g., `edit-form.tsx`, `invitation-list.tsx`) correctly manage `isSubmitting` or `processingId` state with disabled buttons and loading text. Others (sign-in, user invitations, record panels, membership actions) fire async operations with zero visual feedback, risking double-submits. Meanwhile, 10 components use a generic `LoadingCard` skeleton that renders the same card-shaped placeholder regardless of actual component layout.

The existing `Button` component (`ui/button.tsx`) uses CVA variants with `disabled:pointer-events-none disabled:opacity-50` but has no loading-specific props — each consumer independently manages disabled state and text swapping.

## Goals / Non-Goals

**Goals:**

- Add `loading` and `loadingText` props to the existing `Button` component
- Fix all 8 identified submitting-state gaps with standardized loading feedback
- Replace all 10 `LoadingCard` consumers with structurally-faithful co-located skeletons (same slot components, per-content `Skeleton` elements, `my-*` height alignment)
- Delete `custom/loading/` directory entirely
- Refactor `useActiveTeamId` to return `{ teamId, isLoading, error, mutate }` for self-contained consumers
- Add `Empty` UI primitive; replace "${resource} not found" raw text fallbacks with `Empty`
- Refactor `PlayerDetails` and `TeamInfo` info rows to use `Item`/`ItemContent` slot components

**Non-Goals:**

- Adding loading/submitting animation beyond spinner + text (no progress bars, no shimmer effects)
- Changing SWR mutation patterns or error handling logic
- Refactoring existing components that already have correct loading states
- Creating a generic `Skeleton` primitive component (each skeleton is co-located and layout-specific)

## Decisions

### Button Loading Props

Extend `ButtonProps` with two optional props:

```tsx
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}
```

When `loading` is `true`:

- Button is automatically `disabled` (merged with any explicit `disabled` prop)
- A spinner icon (`RiLoader4Line` from `react-icons/ri` with `animate-spin`) is prepended
- If `loadingText` is provided, button text is replaced with `loadingText`
- `aria-busy="true"` is set for accessibility

Implementation approach: minimal change to the existing `Button` component — add the props, conditionally render spinner, merge disabled state. No wrapper component.

```tsx
const Button = ({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingText,
  disabled,
  children,
  ...props
}: ButtonProps) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="Button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <RiLoader4Line className="animate-spin" />}
      {loading && loadingText ? loadingText : children}
    </Comp>
  );
};
```

**Rationale**: Extending the existing Shadcn component keeps the single source of truth. The `loading` prop auto-disables without requiring consumers to pass `disabled={isSubmitting}` separately. The spinner uses `RiLoader4Line` from `react-icons/ri`, consistent with the project's icon library.

### Submitting State Fix Pattern

Each gap follows the same fix pattern — no new abstractions needed:

1. Add a `const [isSubmitting, setIsSubmitting] = useState(false)` (or `useTransition` where applicable)
2. Wrap the async handler with `setIsSubmitting(true)` / `setIsSubmitting(false)` in try/finally
3. Pass `loading={isSubmitting}` and optional `loadingText` to the `Button`

For components with multiple action buttons (e.g., user invitations accept/reject), use a `processingId` pattern (matching `invitation-list.tsx`'s existing approach) to disable all buttons while one is processing.

Specific fixes:

| Component                                        | State Variable   | Button Props                                                        |
| ------------------------------------------------ | ---------------- | ------------------------------------------------------------------- |
| `auth/sign-in/form.tsx`                          | `isSubmitting`   | `loading={isSubmitting}`                                            |
| `user/invitations/index.tsx`                     | `processingId`   | `loading={processingId === id}`, `disabled={processingId !== null}` |
| `record/set-options/panel/options.tsx`           | `isSubmitting`   | `loading={isSubmitting}`                                            |
| `record/panel/substitutes/index.tsx`             | `isSubmitting`   | `loading={isSubmitting}`                                            |
| `record/panel/moves/oppo.tsx`                    | `isProcessing`   | `disabled={isProcessing}` (icon buttons — no text to swap)          |
| `record/new/info-form.tsx`                       | `isSubmitting`   | `loading={isSubmitting}`                                            |
| `team/players/membership-section.tsx` (remove)   | `isRemoving`     | `loading={isRemoving}`                                              |
| `team/players/membership-section.tsx` (transfer) | `isTransferring` | `loading={isTransferring}`                                          |

**Rationale**: Using the same pattern already validated in `edit-form.tsx` and `invitation-list.tsx` ensures consistency. No new hooks or abstractions — just state management around async calls.

### Co-located Skeleton Pattern

Each `LoadingCard` consumer gets a co-located skeleton export that **structurally mirrors** its real component. Skeletons are named exports alongside the main component.

**Structural Fidelity Standard** (established by `MatchSkeleton` in `home/matches.tsx`):

Rules:

1. **Same wrapper** — use the same top-level container (`Item`, `Card`, etc.)
2. **Same structural slots** — use the same slot components (`ItemHeader`/`ItemContent`/`ItemFooter`, `CardHeader`, etc.) with identical className props
3. **Per-content `Skeleton`** — each `<Skeleton>` corresponds to one specific piece of real content (a text label, an icon, a button, an avatar); no "one blob per section"
4. **Height + `my-*` alignment** — Tailwind `text-*` classes add line-height space around the visual glyph. When mirroring a text element, set `Skeleton` height to the glyph height (e.g., `h-6` for `text-xl`) **and** add a `my-*` margin equal to the leading offset (e.g., `my-1`). This makes the `Skeleton` occupy the same total height as the real element and prevents layout shift on load.
5. **Approximate real widths** — `Skeleton` width should approximate the rendered width of the real element
6. **Co-located** — exported as a named function from the same file as the real component

Reference implementation (`MatchSkeleton` in `home/matches.tsx`):

```tsx
// Real — Match uses Item/ItemHeader/ItemContent/ItemFooter slots
function Match({ match }: MatchProps) {
  return (
    <Item className="flex flex-col gap-2 bg-card px-4 py-2" asChild>
      <Link href={`/match/${match._id}`}>
        <ItemHeader className="flex w-full flex-row items-center gap-2">
          <span className="flex-1">{match.info.name || "Regular Game"}</span>
          <span>{/* date */}</span>
        </ItemHeader>
        <ItemContent className="w-full text-xl">
          <TeamInfo team={match.teams.home} isHome />   {/* icon + name (text-xl) + sets (text-3xl) + scores */}
          <TeamInfo team={match.teams.away} isHome={false} />
        </ItemContent>
        <ItemFooter className="flex w-full flex-row items-center justify-end">
          查看比賽 <RiArrowRightWideLine />
        </ItemFooter>
      </Link>
    </Item>
  );
}

// Skeleton — same slots, Skeleton at each leaf position
function MatchSkeleton() {
  return (
    <Item className="w-full gap-2 bg-card px-4 py-2">
      <ItemHeader className="flex w-full flex-row">
        <Skeleton className="mr-auto h-5 w-28 rounded-md" />       {/* name */}
        <Skeleton className="h-5 w-28 rounded-md" />                {/* date */}
      </ItemHeader>
      <ItemContent className="w-full text-xl">
        <div className="flex flex-row gap-2">
          <Skeleton className="my-1 size-6" />                      {/* icon: my-1 = text-xl leading */}
          <Skeleton className="my-1 mr-auto h-6 w-30" />           {/* team name: h-6 = text-xl glyph, my-1 = leading */}
          <Skeleton className="my-1 h-7 w-30" />                   {/* sets (text-3xl): h-7 + my-1 */}
        </div>
        <div className="flex flex-row gap-2">
          <Skeleton className="my-1 size-6" />
          <Skeleton className="my-1 mr-auto h-6 w-30" />
          <Skeleton className="my-1 h-7 w-30" />
        </div>
      </ItemContent>
      <ItemFooter className="flex w-full flex-row items-center justify-end">
        <Skeleton className="h-5 w-24 rounded-md" />                {/* footer link */}
      </ItemFooter>
    </Item>
  );
}
```

After all consumers are migrated, delete `src/components/custom/loading/card.tsx` and the `custom/loading/` directory.

**Rationale**: Structural fidelity makes skeletons visually recognizable as the loading state of their specific component and minimizes layout shift. Co-location keeps skeleton and component in sync. Generic `LoadingCard` matches no component's actual shape.

### LoadingCard Replacement Map

| Consumer File                | Skeleton Export Name     | Layout Shape                                                                              |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| `team/lineup/index.tsx`      | `LineupSkeleton`         | `LoadingCourt` + panel slot placeholders + save button                                    |
| `team/players/list.tsx`      | `PlayersListSkeleton`    | `ItemGroup` + `Item`/`ItemMedia`/`ItemContent` rows per player                            |
| `team/players/info.tsx`      | `PlayerInfoSkeleton`     | `Card` + avatar + name/badge + `Item`-based info rows + edit button                       |
| `team/players/edit-form.tsx` | `PlayerEditFormSkeleton` | `Card` + section title + labeled input rows + submit button                               |
| `team/info/index.tsx`        | `TeamInfoSkeleton`       | `Card`/`CardHeader` + `Item`-based info rows                                              |
| `record/index.tsx`           | `RecordSkeleton`         | `RecordHeader` + `LoadingCourt` + preview slot + panel slot                               |
| `match/sets/index.tsx`       | `MatchSetsSkeleton`      | `Card` + header slot + teams row + sets list rows                                         |
| `match/index.tsx`            | `MatchSkeleton`          | Header slot + banner card (team names + score) + stats card rows                          |
| `home/index.tsx`             | *(removed)*              | `HomeSkeleton` removed — `home/index.tsx` is now a thin wrapper; loading lives in Matches |
| `home/matches.tsx`           | `MatchesSkeleton`        | `ItemGroup` + multiple `MatchSkeleton` — **reference implementation**                     |

**Note**: `team/lineup/index.tsx` also imports `LoadingCourt` (relocated by `component-architecture`). This change only replaces the `LoadingCard` usage there.

### Item Refactor — PlayerInfo and TeamInfo

`team/players/info.tsx` (`PlayerDetails`) and `team/info/index.tsx` (`TeamInfo`) currently render their info rows as raw `div` pairs. Both should be refactored to use the `Item`/`ItemContent` slot components, matching the pattern used in `team/players/list.tsx`. This ensures `PlayerInfoSkeleton` and `TeamInfoSkeleton` can mirror the actual slot structure.

### Not-Found → Empty Pattern

Components with a "${resource} not found" early return should replace the raw text fallback with the `Empty` component from `src/components/ui/empty.tsx`, consistent with `NoMatches` in `home/matches.tsx`:

```tsx
// Before
if (!player) return <div className="p-4 text-center text-sm text-muted-foreground">找不到球員</div>;

// After
if (!player) return (
  <Empty>
    <EmptyMedia variant="icon"><RiUserLine /></EmptyMedia>
    <EmptyHeader>
      <EmptyTitle>找不到球員</EmptyTitle>
    </EmptyHeader>
  </Empty>
);
```

Affected files: `team/players/info.tsx`, `team/players/edit-form.tsx`.

### useActiveTeamId API Refactor

`useActiveTeamId` is refactored from returning a bare `string | undefined` to a result object:

```ts
// Before: const teamId = useActiveTeamId();
// After:
const { teamId, isLoading, error, mutate } = useActiveTeamId();
```

Enables self-contained loading/error handling in consumers without parent wrappers. `nav/links.tsx` destructures the result.

### Empty State Primitive

New `src/components/ui/empty.tsx` — composable empty state UI: `Empty`, `EmptyHeader`, `EmptyMedia` (`icon`/`default` variants), `EmptyTitle`, `EmptyDescription`, `EmptyContent`.

## Risks / Trade-offs

- **[Risk] Skeleton layout drift**: Co-located skeletons may fall out of sync after layout changes → Mitigation: skeletons use the same container components; only placeholder dimensions (widths, heights) could drift. Storybook stories (from `storybook-modernization`) will catch visual regressions.
- **[Risk] Button `asChild` + `loading` conflict**: When `asChild` is true, Button renders a `Slot` which passes props to its child — `loading` behavior (spinner injection) doesn't make sense with `asChild` → Mitigation: `loading` prop is ignored when `asChild` is true; document this constraint.
- **[Trade-off] No global loading state**: Each component manages its own `isSubmitting` locally. This is intentional — a global loading context would be over-engineering for 8 independent components with no shared submission flow.
