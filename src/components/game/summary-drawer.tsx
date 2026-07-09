"use client";
import { EntryRow } from "@/components/game/entry";
import { isLatestEntry } from "@/components/game/entry/last-entry-rule";
import { PreviewCard, useEntryDraftPreview } from "@/components/game/preview";
import { Drawer, DrawerClose, DrawerContent } from "@/components/ui/drawer";
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

/**
 * Presentational unified Preview + drawer (D12). The idle Preview bar
 * (PreviewCard, fed by the shared `useEntryDraftPreview`) is always visible;
 * tapping it either submits the in-progress draft (editing + complete) or
 * expands the modal drawer (not editing) -- it never shows an accordion
 * itself (D8/D12 gesture split). The expanded list lives in a shadcn Drawer
 * (modal), each row an <EntryRow> (group 5) revealing edit on tap-expansion,
 * composed by the last-entry rule.
 *
 * While input is in progress and the drawer is open, `draftEntry` renders as
 * the pulsing first row, reusing PreviewCard's pulse vocabulary; on freeze
 * the caller stops passing `draftEntry` and the newly committed entry
 * naturally becomes the first row of `entries` in place.
 */
export const SummaryDrawerCard = ({
  entries,
  players,
  state,
  preview,
  draftEntry,
  isDraftPulsing,
  onToggle,
  onSubmit,
  onEntryClick,
  onEntryDelete,
  onEntryRollback,
  className,
}: {
  entries: EntryView[];
  players: GamePlayerView[];
  state: SummaryDrawerState;
  preview?: SummaryDrawerPreview;
  draftEntry?: EntryView;
  isDraftPulsing?: boolean;
  onToggle?: () => void;
  onSubmit?: () => void;
  onEntryClick?: (entryIndex: number) => void;
  onEntryDelete?: (entryIndex: number) => void;
  onEntryRollback?: (entryIndex: number) => void;
  className?: string;
}) => {
  return (
    <div
      data-testid="summary-drawer"
      data-state={state}
      className={cn("w-full", className)}
    >
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
        <DrawerContent data-testid="summary-drawer-content">
          <DrawerClose
            data-testid="summary-drawer-handle"
            aria-label="收合逐球紀錄"
            // Discrete tap target, not vaul's drag handle: stop the pointer
            // events here so they don't also feed vaul's drag-to-dismiss
            // gesture tracking on the surrounding Content.
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            className="mx-auto -mt-2 mb-2 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/40"
          />
          <div className="flex flex-col gap-1 overflow-y-auto px-4 pb-4">
            {draftEntry && (
              <div
                data-testid="summary-drawer-draft-row"
                className={cn(isDraftPulsing && "animate-pulse duration-1000")}
              >
                <EntryRow
                  entry={draftEntry}
                  players={players}
                  isLatest={true}
                />
              </div>
            )}
            {entries
              .map((entry, entryIndex) => ({ entry, entryIndex }))
              // Newest first: the latest entry rises to the first row, in
              // DOM order (not just visually), so it reads correctly for
              // assistive tech too.
              .reverse()
              .map(({ entry, entryIndex }) => (
                <div key={entryIndex} data-testid="summary-drawer-row">
                  <EntryRow
                    entry={entry}
                    players={players}
                    isLatest={isLatestEntry(entryIndex, entries.length)}
                    onEdit={() => onEntryClick?.(entryIndex)}
                    onDelete={() => onEntryDelete?.(entryIndex)}
                    onRollbackToHere={() => onEntryRollback?.(entryIndex)}
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
  const entries = game!.sets[setIndex].entries;
  const players = game!.teams.home.players;

  // Single source of truth for "input in progress" (shared with the
  // Preview): only render the draft as the first row while the drawer is
  // expanded and the draft is actually being edited.
  const preview = useEntryDraftPreview(gameId, "general");
  const draftEntry =
    preview.inProgress && preview.isEditing ? preview.entry : undefined;
  const isDraftPulsing =
    preview.inProgress && preview.isEditing && !preview.isComplete;

  const handleEntryClick = (entryIndex: number) => {
    dispatch(gameActions.setEditingEntryStatus({ game: game!, entryIndex }));
  };

  return (
    <SummaryDrawerCard
      entries={entries}
      players={players}
      state={state}
      preview={preview.inProgress ? preview : undefined}
      draftEntry={state === "expanded" ? draftEntry : undefined}
      isDraftPulsing={isDraftPulsing}
      onToggle={onToggle}
      onSubmit={onSubmit}
      onEntryClick={handleEntryClick}
      className={className}
    />
  );
};
