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

/** An entry paired with its original index in the set (kept through filtering). */
export type IndexedEntry = { entry: EntryView; index: number };

/**
 * Presentational unified Preview + drawer (D12). Two pieces:
 *
 * 1. The idle **peek** -- a normal-flow, fixed-height element (the last child of
 *    the viewport flex column): a handle at the top edge with the Preview bar
 *    (PreviewCard, fed by the shared `useEntryDraftPreview`) directly beneath
 *    it. The Preview IS the newest row: not editing -> the latest committed
 *    entry; editing/recording -> the draft in place (pulsing until complete).
 *    Tapping it either submits (editing + complete) or expands the drawer (not
 *    editing) -- it never shows an accordion itself (D8/D12 gesture split).
 *
 * 2. The expanded **modal** -- a vaul `Drawer` (portalled to <body>, so it is
 *    never clipped by the column's `overflow-hidden`) with a backdrop overlay
 *    and a bottom sheet up to `85dvh` tall (dialog-scale, not limited to the
 *    panel height). It lists every committed entry EXCEPT the one the Preview
 *    already occupies (`entries`, pre-filtered by the container), so the same
 *    entry is never shown twice. Closing (overlay tap, drag, or handle) toggles
 *    back to idle.
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
  preview?: SummaryDrawerPreview;
  onToggle?: () => void;
  onSubmit?: () => void;
  // Full committed-entry count, so isLatest is computed against the real set
  // even though `entries` has the Preview's row filtered out.
  totalEntries: number;
  onEntryClick?: (entryIndex: number) => void;
  onEntryDelete?: (entryIndex: number) => void;
  onEntryRollback?: (entryIndex: number) => void;
  className?: string;
}) => {
  return (
    <div
      data-testid="summary-drawer"
      data-state={state}
      // The idle peek is the top edge of the bottom drawer, so it uses the same
      // surface (bg-card) as the expanded modal and the dialog -- the handle
      // button sits on it rather than on the page background.
      className={cn("w-full rounded-t-[10px] bg-card", className)}
    >
      <button
        data-testid="summary-drawer-handle"
        aria-expanded={state === "expanded"}
        aria-label={state === "expanded" ? "收合逐球紀錄" : "展開逐球紀錄"}
        onClick={onToggle}
        className="w-full pt-1 pb-1.5"
      >
        <span className="mx-auto block h-1.5 w-10 rounded-full bg-muted-foreground/40" />
      </button>
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
      <Drawer
        open={state === "expanded"}
        onOpenChange={(open) => {
          if (!open) onToggle?.();
        }}
      >
        <DrawerContent
          data-testid="summary-drawer-modal"
          className="mx-auto max-h-[85dvh] max-w-160"
        >
          <DrawerTitle className="sr-only">逐球紀錄</DrawerTitle>
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 pt-2 pb-6">
            {entries
              // Newest first, in DOM order (not just visually) so it reads
              // correctly for assistive tech too.
              .slice()
              .reverse()
              .map(({ entry, index }) => (
                <div key={index} data-testid="summary-drawer-row">
                  <EntryRow
                    entry={entry}
                    players={players}
                    isLatest={isLatestEntry(index, totalEntries)}
                    onEdit={() => onEntryClick?.(index)}
                    onDelete={() => onEntryDelete?.(index)}
                    onRollbackToHere={() => onEntryRollback?.(index)}
                  />
                </div>
              ))}
            <Separator content="比賽開始" />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export const SummaryDrawer = ({
  gameId,
  state: controlledState,
  onToggle: controlledOnToggle,
  onSubmit,
  className,
}: {
  gameId: string;
  // Controlled by the Game composition (index.tsx) so the Preview's
  // in-progress tap and the drawer's own close affordance can both drive the
  // same expanded/idle state (D8/D12 gesture split). Falls back to internal
  // state when uncontrolled (e.g. Storybook / standalone usage).
  state?: SummaryDrawerState;
  onToggle?: () => void;
  onSubmit?: () => void;
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

  // Guard against a transient undefined game (e.g. a failed optimistic mutate
  // rolling back) so a submission error never crashes the whole Game tree.
  if (!game) return null;
  const entries = game.sets[setIndex].entries;
  const players = game.teams.home.players;

  // The expanded list shows every committed entry, including the one the
  // Preview also displays (the newest committed row): the Preview is a peek,
  // the expanded list is the full record, so the latest entry intentionally
  // appears in both. The in-progress draft is not a committed entry, so it is
  // never a list row -- it stays the pulsing Preview only.
  const listEntries = entries.map((entry, index) => ({ entry, index }));

  const handleEntryClick = (entryIndex: number) => {
    dispatch(gameActions.setEditingEntryStatus({ game, entryIndex }));
  };

  return (
    <SummaryDrawerCard
      entries={listEntries}
      totalEntries={entries.length}
      players={players}
      state={state}
      preview={preview.inProgress ? preview : undefined}
      onToggle={onToggle}
      onSubmit={onSubmit}
      onEntryClick={handleEntryClick}
      className={className}
    />
  );
};
