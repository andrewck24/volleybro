## Context

The codebase has inconsistent loading/submitting feedback. Some components (e.g., `edit-form.tsx`, `invitation-list.tsx`) correctly manage `isSubmitting` or `processingId` state with disabled buttons and loading text. Others (sign-in, user invitations, record panels, membership actions) fire async operations with zero visual feedback, risking double-submits. Meanwhile, 10 components use a generic `LoadingCard` skeleton that renders the same card-shaped placeholder regardless of actual component layout.

The existing `Button` component (`ui/button.tsx`) uses CVA variants with `disabled:pointer-events-none disabled:opacity-50` but has no loading-specific props — each consumer independently manages disabled state and text swapping.

## Goals / Non-Goals

**Goals:**

- Add `loading` and `loadingText` props to the existing `Button` component
- Fix all 8 identified submitting-state gaps with standardized loading feedback
- Replace all 10 `LoadingCard` consumers with layout-matched co-located skeletons
- Delete `custom/loading/` directory entirely

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

Each `LoadingCard` consumer gets a co-located skeleton export that matches its actual layout. Skeletons are named exports alongside the main component:

```tsx
// Example: team/players/list.tsx
export function PlayersListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-32 rounded bg-muted animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 h-12 px-3">
            <div className="size-8 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

Each skeleton:

- Uses the same container components as the real component (Card, CardHeader, etc.)
- Matches the approximate layout dimensions of the loaded state
- Uses `bg-muted animate-pulse` for placeholder elements (consistent with existing patterns)
- Is exported as a named function from the same file

After all 10 consumers are migrated, delete `src/components/custom/loading/card.tsx` and the `custom/loading/` directory.

**Rationale**: Co-located skeletons stay in sync with their component's layout (same file = same PR review). Generic `LoadingCard` provides poor UX because it doesn't match any component's actual shape.

### LoadingCard Replacement Map

| Consumer File                | Skeleton Export Name     | Layout Shape                                                                        |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------- |
| `team/lineup/index.tsx`      | `LineupSkeleton`         | Court-like placeholder (note: `LoadingCourt` relocated by `component-architecture`) |
| `team/players/list.tsx`      | `PlayersListSkeleton`    | Card + 3-5 list item placeholders                                                   |
| `team/players/info.tsx`      | `PlayerInfoSkeleton`     | Card + avatar + text lines                                                          |
| `team/players/edit-form.tsx` | `PlayerEditFormSkeleton` | Card + form field placeholders                                                      |
| `team/info/index.tsx`        | `TeamInfoSkeleton`       | Card + team details placeholders                                                    |
| `record/index.tsx`           | `RecordSkeleton`         | Court + score area placeholders                                                     |
| `match/sets/index.tsx`       | `MatchSetsSkeleton`      | Card + tab-like area                                                                |
| `match/index.tsx`            | `MatchSkeleton`          | Card + stats summary                                                                |
| `home/index.tsx`             | `HomeSkeleton`           | Card list placeholders                                                              |
| `home/matches.tsx`           | `MatchesSkeleton`        | Card + match list items                                                             |

**Note**: `team/lineup/index.tsx` also imports `LoadingCourt` which will be relocated by `component-architecture`. This change only replaces the `LoadingCard` usage there.

## Risks / Trade-offs

- **[Risk] Skeleton layout drift**: Co-located skeletons may fall out of sync after layout changes → Mitigation: skeletons use the same container components; only placeholder dimensions (widths, heights) could drift. Storybook stories (from `storybook-modernization`) will catch visual regressions.
- **[Risk] Button `asChild` + `loading` conflict**: When `asChild` is true, Button renders a `Slot` which passes props to its child — `loading` behavior (spinner injection) doesn't make sense with `asChild` → Mitigation: `loading` prop is ignored when `asChild` is true; document this constraint.
- **[Trade-off] No global loading state**: Each component manages its own `isSubmitting` locally. This is intentional — a global loading context would be over-engineering for 8 independent components with no shared submission flow.
