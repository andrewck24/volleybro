"use client";
import { EntryRow } from "@/components/game/entry";
import { isLatestEntry } from "@/components/game/entry/last-entry-rule";
import { PreviewCard, useEntryDraftPreview } from "@/components/game/preview";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { useGame } from "@/hooks/use-data";
import { gameActions } from "@/lib/features/game/game-slice";
import type { EntryView, GamePlayerView } from "@/lib/features/game/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { useState } from "react";

export type SummaryDrawerState = "idle" | "expanded";

/** Props PreviewCard needs, minus `inProgress` (the caller already checked it). */
export type SummaryDrawerPreview = {
  entry: EntryView;
  previousEntry: EntryView;
  players: GamePlayerView[];
  isEditing: boolean;
  isComplete: boolean;
  entryIndex: number;
};

/** An entry paired with its original index in the set (kept through mapping). */
export type IndexedEntry = { entry: EntryView; index: number };

// The peek (first) snap point: enough to show the handle + the top row (the
// draft Preview while recording, or the newest entry row while idle). vaul
// `parseInt`s snap strings, so they MUST be px (or a 0-1 screen fraction) --
// a rem string like "4.75rem" parses to 4(px). This lone value stays px by
// vaul's API; it is the px equivalent of the 4.75rem peek reserved in the
// layout. The second snap is the expanded ~85dvh sheet.
// = 5rem: handle + one entry row + comfortable whitespace below it. Since the
// collapsed peek renders only the top row, the space under it is empty drawer
// surface (not a clipped second entry), so the peek can breathe.
const PEEK_SNAP = "80px";
const SNAP_POINTS: (number | string)[] = [PEEK_SNAP, 0.85];

/**
 * The Summary is a single vaul drawer (design.tsx model), NOT a separate peek
 * plus a portalled modal. Using vaul's `snapPoints`, the same always-mounted
 * DrawerContent shows only its top edge at the peek snap and rises to ~85dvh
 * when expanded, so the peek's top row IS the top of the expanded drawer.
 *
 * The top row follows the two states (D8/D12):
 * - **recording**: a pulsing draft `PreviewCard` sits above the committed list;
 *   tapping it submits (when complete), the handle toggles the drawer.
 * - **idle**: there is no separate Preview bar -- the newest committed entry is
 *   simply the top `EntryRow`; tapping it while collapsed expands the drawer,
 *   and while expanded it inline-expands (accordion) like any other row.
 *
 * The committed list always shows every committed entry as an actionable row;
 * only the uncommitted draft is rendered as the distinct Preview bar. Inline
 * expansion and swipe-reveal are single-open, owned here so tapping/​swiping one
 * row collapses the others.
 */
export const SummaryDrawerCard = ({
  entries,
  players,
  state,
  preview,
  onToggle,
  onSubmit,
  totalEntries,
  onEntryClick,
  onEntryDelete,
  onEntryRollback,
  className,
}: {
  entries: IndexedEntry[];
  players: GamePlayerView[];
  state: SummaryDrawerState;
  // Present only while recording an uncommitted draft; idle has no Preview bar.
  preview?: SummaryDrawerPreview;
  onToggle?: () => void;
  onSubmit?: () => void;
  totalEntries: number;
  onEntryClick?: (entryIndex: number) => void;
  onEntryDelete?: (entryIndex: number) => void;
  onEntryRollback?: (entryIndex: number) => void;
  className?: string;
}) => {
  const expanded = state === "expanded";
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [revealIndex, setRevealIndex] = useState<number | null>(null);
  // At the peek every row reads as collapsed/unrevealed (no inline detail peeks
  // out); the stored index only takes effect once expanded. Derived rather than
  // reset in an effect.
  const openIdx = expanded ? openIndex : null;
  const revealIdx = expanded ? revealIndex : null;

  // Newest-first. The collapsed peek renders ONLY the top row -- the draft
  // Preview while recording, else the single newest committed entry -- so below
  // it is natural empty drawer space instead of a hard-clipped second entry (a
  // clip mid-list reads as cramped). The full list renders only when expanded.
  const orderedCommitted = entries.slice().reverse();
  const committedToRender = expanded
    ? orderedCommitted
    : preview
      ? []
      : orderedCommitted.slice(0, 1);

  const activeSnapPoint = expanded ? SNAP_POINTS[1] : SNAP_POINTS[0];

  // vaul reports snap changes from drag; reflect them back into our state.
  const handleSnapChange = (snap: number | string | null) => {
    const nowExpanded = snap === SNAP_POINTS[1];
    if (nowExpanded !== expanded) onToggle?.();
  };

  return (
    <>
      {/* Own backdrop, not vaul's: vaul's Overlay returns null whenever
          modal={false} (which we require so the peek leaves the court/panel
          interactive), so it can never provide the spec's "backdrop only while
          expanded". This scrim (design.tsx uses the same approach) sits below
          the portalled drawer (z-50) and above the court/panel; it fades in only
          when expanded and tapping it collapses back to the peek. */}
      <div
        aria-hidden
        data-testid="summary-drawer-overlay"
        onClick={onToggle}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 transition-opacity duration-300",
          expanded ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <Drawer
        // `open` is always true so the peek is the floor and the drawer never
        // unmounts; a drag-down dismiss attempt is turned into a
        // collapse-to-peek via onOpenChange rather than an actual close.
        open
        onOpenChange={(o) => {
          if (!o && expanded) onToggle?.();
        }}
        // Kept constant (non-modal): the peek must leave the court/panel below
        // interactive, and toggling `modal` remounts vaul's Overlay with a
        // different hook count (crash). The backdrop is our own scrim above.
        modal={false}
        snapPoints={SNAP_POINTS}
        activeSnapPoint={activeSnapPoint}
        setActiveSnapPoint={handleSnapChange}
        shouldScaleBackground={false}
      >
        <DrawerContent
          data-testid="summary-drawer"
          data-state={state}
          // Escape collapses the expanded sheet to the peek. preventDefault stops
          // radix's own dismiss so onOpenChange doesn't also fire and double-toggle.
          onEscapeKeyDown={(e) => {
            if (expanded) {
              e.preventDefault();
              onToggle?.();
            }
          }}
          // Full-viewport height is REQUIRED for vaul's snap math: it translates
          // the drawer down by (viewportHeight - snapHeight), which only reveals
          // the peek (the drawer's top edge -- handle + top row) if the element is
          // full height with its top at y=0. An auto-height drawer gets pushed off
          // screen entirely (no peek). The handle stays shrink-0 and the list
          // flexes/scrolls within.
          className={cn("mx-auto h-dvh max-w-160", className)}
        >
          {/* The visible content lives in the top 85dvh -- the expanded snap.
            The drawer element itself is full height (for vaul's snap math), so
            content must not spill into the hidden bottom 15dvh; capping the
            column keeps the whole list within the reachable/scrollable area. */}
          <div className="flex h-[85dvh] flex-col">
            <DrawerTitle className="sr-only">逐球紀錄</DrawerTitle>
            <button
              data-testid="summary-drawer-handle"
              aria-expanded={expanded}
              aria-label={expanded ? "收合逐球紀錄" : "展開逐球紀錄"}
              onClick={onToggle}
              className="w-full shrink-0 pt-2 pb-1.5"
            >
              <span className="mx-auto block h-1.5 w-10 rounded-full bg-muted-foreground/40" />
            </button>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-6">
              {preview && (
                <PreviewCard
                  // Remounts on the next entry so PreviewCard's local freeze/flash
                  // state always starts fresh once the real submission lands.
                  key={preview.entryIndex}
                  entry={preview.entry}
                  previousEntry={preview.previousEntry}
                  players={preview.players}
                  isEditing={preview.isEditing}
                  isPulsing={preview.isEditing && !preview.isComplete}
                  isComplete={preview.isComplete}
                  onSubmit={onSubmit}
                  onExpand={onToggle}
                />
              )}
              {committedToRender.map(({ entry, index }) => (
                <div key={index} data-testid="summary-drawer-row">
                  <EntryRow
                    entry={entry}
                    players={players}
                    isLatest={isLatestEntry(index, totalEntries)}
                    expanded={openIdx === index}
                    // Collapsed peek: a row tap expands the drawer (design.tsx
                    // rowTap). Expanded: it inline-expands (single-open).
                    onToggleExpand={() => {
                      if (!expanded) {
                        onToggle?.();
                        return;
                      }
                      setOpenIndex((cur) => (cur === index ? null : index));
                    }}
                    swipeRevealed={revealIdx === index}
                    onSwipeReveal={(revealed) =>
                      setRevealIndex(revealed ? index : null)
                    }
                    onEdit={() => onEntryClick?.(index)}
                    onDelete={() => onEntryDelete?.(index)}
                    onRollbackToHere={() => onEntryRollback?.(index)}
                  />
                </div>
              ))}
              {/* The "match start" divider only belongs to the full list. */}
              {expanded && <Separator content="比賽開始" />}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export const SummaryDrawer = ({
  gameId,
  state: controlledState,
  onToggle: controlledOnToggle,
  onSubmit,
  onEditRequest,
  className,
}: {
  gameId: string;
  state?: SummaryDrawerState;
  onToggle?: () => void;
  onSubmit?: () => void;
  onEditRequest?: () => void;
  className?: string;
}) => {
  const [uncontrolledState, setUncontrolledState] =
    useState<SummaryDrawerState>("idle");
  const state = controlledState ?? uncontrolledState;
  const onToggle =
    controlledOnToggle ??
    (() => setUncontrolledState((s) => (s === "idle" ? "expanded" : "idle")));

  const dispatch = useAppDispatch();
  const { game } = useGame(gameId);
  const { setIndex } = useAppSelector((s) => s.game);
  const preview = useEntryDraftPreview(gameId, "general");

  // Guard a transient undefined game (e.g. a failed optimistic mutate rolling
  // back) so a submission error never crashes the whole Game tree.
  if (!game) return null;
  const entries = game.sets[setIndex].entries;
  const players = game.teams.home.players;

  // The committed list always shows every committed entry as an actionable row.
  // Only the uncommitted draft is the distinct Preview bar (while recording);
  // when idle the newest committed entry is simply the top row, so it appears
  // in the list rather than as a separate preview.
  const recording = preview.inProgress && preview.isEditing;
  const listEntries = entries.map((entry, index) => ({ entry, index }));

  const handleEntryClick = (entryIndex: number) => {
    dispatch(gameActions.setEditingEntryStatus({ game, entryIndex }));
    onEditRequest?.();
  };

  return (
    <SummaryDrawerCard
      entries={listEntries}
      totalEntries={entries.length}
      players={players}
      state={state}
      preview={recording && preview.inProgress ? preview : undefined}
      onToggle={onToggle}
      onSubmit={onSubmit}
      onEntryClick={handleEntryClick}
      className={className}
    />
  );
};
