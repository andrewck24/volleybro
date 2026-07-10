"use client";
import { EntryRow } from "@/components/game/entry";
import { isLatestEntry } from "@/components/game/entry/last-entry-rule";
import { PreviewCard, useEntryDraftPreview } from "@/components/game/preview";
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
 * Presentational unified Preview + drawer (D12). This is a custom bottom-
 * anchored sheet (not a vaul modal): it is `absolute inset-x-0 bottom-0` inside
 * the panel region and slides on `translate-y`. When idle it is translated down
 * so only its top edge -- the handle plus the Preview beneath it -- peeks above
 * the panel; when expanded it slides to `translate-y-0`, covering the panel and
 * revealing the reversed EntryRow list beneath the Preview.
 *
 * The handle sits at the very top edge (always visible, toggles the sheet); the
 * Preview bar (PreviewCard, fed by the shared `useEntryDraftPreview`) sits just
 * below it and is likewise always visible. The Preview IS the newest row: while
 * not editing it shows the latest committed entry, while editing/recording it
 * shows the draft in place (pulsing until complete). Tapping the Preview either
 * submits (editing + complete) or expands the sheet (not editing) -- it never
 * shows an accordion itself (D8/D12 gesture split).
 *
 * The expanded list therefore renders every committed entry EXCEPT the one the
 * Preview already occupies (`entries`, pre-filtered by the container), so the
 * same entry is never shown twice.
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
      className={cn(
        // Bottom-anchored sheet: peeks (handle + Preview top edge) when idle,
        // slides up to cover the panel when expanded (mockup design.tsx:1024).
        "absolute inset-x-0 bottom-0 z-10 flex h-full flex-col rounded-t-xl border bg-card p-1.5 shadow-lg transition-transform duration-300",
        state === "expanded"
          ? "translate-y-0"
          : "translate-y-[calc(100%-4.5rem)]",
        className,
      )}
    >
      <button
        data-testid="summary-drawer-handle"
        aria-expanded={state === "expanded"}
        aria-label={state === "expanded" ? "收合逐球紀錄" : "展開逐球紀錄"}
        onClick={onToggle}
        className="shrink-0 pt-1 pb-1.5"
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
      {state === "expanded" && (
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pt-1 pb-2">
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
      )}
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

  // Which committed entry the Preview already occupies, so the list below never
  // repeats it: while editing/recording the Preview shows the draft at
  // `entryIndex` (out of range for a brand-new entry -> nothing filtered);
  // otherwise it shows the latest committed entry at `entryIndex - 1`.
  const previewIndex = preview.inProgress
    ? preview.isEditing
      ? preview.entryIndex
      : preview.entryIndex - 1
    : -1;
  const listEntries = entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ index }) => index !== previewIndex);

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
