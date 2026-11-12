"use client";
import { EntryRow } from "@/components/game/entry";
import { isLatestEntry } from "@/components/game/entry/last-entry-rule";
import {
  PreviewCard,
  useEntryDraftPreview,
  type PreviewCardProps,
} from "@/components/game/preview";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { useGame, useTeamPlayers } from "@/hooks/use-data";
import { gameActions } from "@/lib/features/game/game-slice";
import { hasFailedWrite } from "@/lib/features/game/pending-writes";
import type { EntryView, GamePlayerView } from "@/lib/features/game/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

export type SummaryDrawerState = "idle" | "expanded";

export type SummaryDrawerPreview = Omit<PreviewCardProps, "hasPreview"> & {
  entryIndex: number;
};

export type IndexedEntry = { entry: EntryView; originalIndex: number };

const PEEK_SNAP = "80px";
const SNAP_POINTS: (number | string)[] = [PEEK_SNAP, 0.85];

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
  failedEntryIds,
  onEntryRetry,
  recorderNames,
  className,
}: {
  entries: IndexedEntry[];
  players: GamePlayerView[];
  state: SummaryDrawerState;
  preview?: SummaryDrawerPreview;
  onToggle?: () => void;
  onSubmit?: () => void;
  totalEntries: number;
  onEntryClick?: (entryIndex: number) => void;
  onEntryDelete?: (entryIndex: number) => void;
  onEntryRollback?: (entryIndex: number) => void;
  failedEntryIds?: Set<string>;
  onEntryRetry?: () => void;
  recorderNames?: ReadonlyMap<string, string>;
  className?: string;
}) => {
  const expanded = state === "expanded";
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const openIdx = expanded ? openIndex : null;

  const orderedCommitted = entries.slice().reverse();
  const committedToRender = expanded
    ? orderedCommitted
    : preview
      ? []
      : orderedCommitted.slice(0, 1);

  const activeSnapPoint = expanded ? SNAP_POINTS[1] : SNAP_POINTS[0];

  const handleSnapChange = (snap: number | string | null) => {
    const nowExpanded = snap === SNAP_POINTS[1];
    if (nowExpanded !== expanded) onToggle?.();
  };

  return (
    <>
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
        open
        onOpenChange={(o) => {
          if (!o && expanded) onToggle?.();
        }}
        modal={false}
        snapPoints={SNAP_POINTS}
        activeSnapPoint={activeSnapPoint}
        setActiveSnapPoint={handleSnapChange}
        shouldScaleBackground={false}
      >
        <DrawerContent
          data-testid="summary-drawer"
          data-state={state}
          onEscapeKeyDown={(e) => {
            if (expanded) {
              e.preventDefault();
              onToggle?.();
            }
          }}
          className={cn("mx-auto h-dvh max-w-160", className)}
        >
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
              {committedToRender.map(({ entry, originalIndex }) => (
                <div key={originalIndex} data-testid="summary-drawer-row">
                  <EntryRow
                    entry={entry}
                    players={players}
                    isLatest={isLatestEntry(originalIndex, totalEntries)}
                    expanded={openIdx === originalIndex}
                    onToggleExpand={() => {
                      if (!expanded) {
                        onToggle?.();
                        return;
                      }
                      setOpenIndex((cur) =>
                        cur === originalIndex ? null : originalIndex,
                      );
                    }}
                    onEdit={() => onEntryClick?.(originalIndex)}
                    onDelete={() => onEntryDelete?.(originalIndex)}
                    onRollbackToHere={() => onEntryRollback?.(originalIndex)}
                    failed={failedEntryIds?.has(entry.id) ?? false}
                    onRetry={onEntryRetry}
                    recorderNames={recorderNames}
                  />
                </div>
              ))}

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
  onEntryRetry,
  className,
}: {
  gameId: string;
  state?: SummaryDrawerState;
  onToggle?: () => void;
  onSubmit?: () => void;
  onEditRequest?: () => void;
  onEntryRetry?: () => void;
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
  const { players: teamPlayers } = useTeamPlayers(game?.teamId ?? "");
  const recorderNames = useMemo(
    () => teamPlayers && new Map(teamPlayers.map((p) => [p.id, p.name])),
    [teamPlayers],
  );
  const failedEntryIds = useAppSelector(
    (s) =>
      new Set(
        s.pendingWrites.pending
          .filter((p) => hasFailedWrite(s.pendingWrites, p.entry.id))
          .map((p) => p.entry.id),
      ),
  );

  if (!game) return null;
  const entries = game.sets[setIndex]?.entries ?? [];
  const players = game.teams.home.players;

  const recording = preview.hasPreview && preview.isEditing;
  const listEntries = entries.map((entry, originalIndex) => ({
    entry,
    originalIndex,
  }));

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
      preview={recording && preview.hasPreview ? preview : undefined}
      onToggle={onToggle}
      onSubmit={onSubmit}
      onEntryClick={handleEntryClick}
      failedEntryIds={failedEntryIds}
      onEntryRetry={onEntryRetry}
      recorderNames={recorderNames}
      className={className}
    />
  );
};
