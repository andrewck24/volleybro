"use client";
import { EntryRow } from "@/components/game/entry";
import { isLatestEntry } from "@/components/game/entry/last-entry-rule";
import { useEntryDraftPreview } from "@/components/game/preview";
import { Separator } from "@/components/ui/separator";
import { useGame } from "@/hooks/use-data";
import { gameActions } from "@/lib/features/game/game-slice";
import type { EntryView, GamePlayerView } from "@/lib/features/game/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { useState } from "react";

export type SummaryDrawerState = "idle" | "expanded";

/**
 * Presentational Preview-anchored bottom drawer (D12). Idle exposes only the
 * handle + latest entry; expanding rises the latest entry with the top edge
 * into the first row of the full list, in place -- each row is an <EntryRow>
 * (group 5), revealing edit/delete/rollback on left-swipe or tap-expansion,
 * composed by the last-entry rule (delete only for the latest entry).
 *
 * The gesture split lives in the Preview (preview.tsx): the handle here
 * always toggles `state`, regardless of input progress. While input is in
 * progress and the drawer is expanded, `draftEntry` renders as the pulsing
 * first row (D8/D12 "role transition"), reusing PreviewCard's pulse
 * vocabulary rather than inventing new styling; on freeze the caller stops
 * passing `draftEntry` and the newly committed entry naturally becomes the
 * first row of `entries` in place.
 */
export const SummaryDrawerCard = ({
  entries,
  players,
  state,
  draftEntry,
  isDraftPulsing,
  onToggle,
  onEntryClick,
  onEntryDelete,
  onEntryRollback,
  className,
}: {
  entries: EntryView[];
  players: GamePlayerView[];
  state: SummaryDrawerState;
  draftEntry?: EntryView;
  isDraftPulsing?: boolean;
  onToggle?: () => void;
  onEntryClick?: (entryIndex: number) => void;
  onEntryDelete?: (entryIndex: number) => void;
  onEntryRollback?: (entryIndex: number) => void;
  className?: string;
}) => {
  const latestIndex = entries.length - 1;
  const latestEntry = latestIndex >= 0 ? entries[latestIndex] : undefined;

  return (
    <div
      data-testid="summary-drawer"
      data-state={state}
      className={cn("flex w-full flex-col gap-1", className)}
    >
      <button
        type="button"
        data-testid="summary-drawer-handle"
        aria-expanded={state === "expanded"}
        aria-label="展開逐球紀錄"
        onClick={onToggle}
        className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/40"
      />
      {state === "expanded" ? (
        <div className="flex flex-col gap-1">
          {draftEntry && (
            <div
              data-testid="summary-drawer-draft-row"
              className={cn(isDraftPulsing && "animate-pulse duration-1000")}
            >
              <EntryRow entry={draftEntry} players={players} isLatest={true} />
            </div>
          )}
          {entries
            .map((entry, entryIndex) => ({ entry, entryIndex }))
            // Newest first: the latest entry rises with the drawer's top
            // edge and becomes the first row, in DOM order (not just
            // visually), so it reads correctly for assistive tech too.
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
      ) : (
        latestEntry && (
          <div data-testid="summary-drawer-row">
            <EntryRow
              entry={latestEntry}
              players={players}
              isLatest={true}
              onEdit={() => onEntryClick?.(latestIndex)}
              onDelete={() => onEntryDelete?.(latestIndex)}
              onRollbackToHere={() => onEntryRollback?.(latestIndex)}
            />
          </div>
        )
      )}
    </div>
  );
};

export const SummaryDrawer = ({
  gameId,
  state: controlledState,
  onToggle: controlledOnToggle,
  className,
}: {
  gameId: string;
  // Controlled by the Game composition (index.tsx) so the Preview's
  // in-progress tap and the handle can both drive the same expanded/idle
  // state (D8/D12 gesture split). Falls back to internal state when
  // uncontrolled (e.g. Storybook / standalone usage).
  state?: SummaryDrawerState;
  onToggle?: () => void;
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
  // Preview, task group 6 audit): only render the draft as the first row
  // while the drawer is expanded and the draft is actually being edited.
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
      draftEntry={state === "expanded" ? draftEntry : undefined}
      isDraftPulsing={isDraftPulsing}
      onToggle={onToggle}
      onEntryClick={handleEntryClick}
      className={className}
    />
  );
};
