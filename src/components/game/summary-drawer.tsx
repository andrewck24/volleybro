"use client";
import { EntryRow } from "@/components/game/entry";
import { isLatestEntry } from "@/components/game/entry/last-entry-rule";
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
 * The Preview<->drawer gesture split plus in-progress draft row (group 6) are
 * deliberately left as a seam: this component only owns idle/expanded + the
 * handle toggle.
 */
export const SummaryDrawerCard = ({
  entries,
  players,
  state,
  onToggle,
  onEntryClick,
  onEntryDelete,
  onEntryRollback,
  className,
}: {
  entries: EntryView[];
  players: GamePlayerView[];
  state: SummaryDrawerState;
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
  className,
}: {
  gameId: string;
  className?: string;
}) => {
  const [state, setState] = useState<SummaryDrawerState>("idle");
  const dispatch = useAppDispatch();
  const { game } = useGame(gameId);
  const { setIndex } = useAppSelector((s) => s.game);
  const entries = game!.sets[setIndex].entries;
  const players = game!.teams.home.players;

  const handleEntryClick = (entryIndex: number) => {
    dispatch(gameActions.setEditingEntryStatus({ game: game!, entryIndex }));
  };

  return (
    <SummaryDrawerCard
      entries={entries}
      players={players}
      state={state}
      onToggle={() => setState((s) => (s === "idle" ? "expanded" : "idle"))}
      onEntryClick={handleEntryClick}
      className={className}
    />
  );
};
