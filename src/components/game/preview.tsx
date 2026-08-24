"use client";
import { Entry } from "@/components/game/entry";
import { getEntryProgress } from "@/components/game/panel/entry-progress";
import { EntryType } from "@/entities/game";
import { useGame } from "@/hooks/use-data";
import { usePendingWrites } from "@/hooks/use-pending-writes";
import {
  hasFailedWrite,
  isPendingWrite,
} from "@/lib/features/game/pending-writes";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import type {
  EntryView,
  GamePlayerView,
  ReduxGameState,
} from "@/lib/features/game/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { RiSendPlaneLine } from "react-icons/ri";

// Draft row: pulses while incomplete, shows a send affordance when complete,
// and freezes/flashes on submit until the parent remounts it via key.
//
// `writing`/`failed`/`onRetry` are D4 territory: only the editing path (an
// existing rally being replaced, not optimistic) ever sets them. Create
// never does -- it advances immediately and its own progress belongs to
// SyncIndicator, not this card.
export const PreviewCard = ({
  entry,
  previousEntry,
  players,
  isEditing,
  isPulsing,
  isComplete,
  writing,
  failed,
  onRetry,
  onSubmit,
  onExpand,
  className,
}: {
  entry?: EntryView;
  previousEntry?: EntryView;
  players: GamePlayerView[];
  isEditing?: boolean;
  isPulsing?: boolean;
  isComplete?: boolean;
  writing?: boolean;
  failed?: boolean;
  onRetry?: () => void;
  onSubmit?: () => void;
  onExpand?: () => void;
  className?: string;
}) => {
  const [frozen, setFrozen] = useState(false);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (!flashing) return;
    const id = setTimeout(() => setFlashing(false), 500);
    return () => clearTimeout(id);
  }, [flashing]);

  const handleClick = () => {
    // In flight or already failed: only the explicit retry control acts.
    if (writing || failed) return;
    if (isEditing && isComplete && !frozen) {
      setFrozen(true);
      setFlashing(true);
      onSubmit?.();
      return;
    }
    if (!isEditing) onExpand?.();
  };

  const shownEntry = frozen ? (previousEntry ?? entry) : entry;
  const showSendAffordance = Boolean(
    isEditing && isComplete && !frozen && !writing && !failed,
  );

  return (
    <div
      data-testid="preview-card"
      className={cn("relative grid w-full", className)}
    >
      <div
        data-testid="preview-trigger"
        onClick={handleClick}
        className={cn(isPulsing && !frozen && "animate-pulse duration-1000")}
      >
        <Entry
          entry={shownEntry}
          players={players}
          className={cn(
            "transition-colors duration-500",
            showSendAffordance && "bg-primary text-primary-foreground",
            flashing && "bg-primary/30",
            failed && "ring-1 ring-destructive",
          )}
        />
      </div>
      {showSendAffordance && (
        <span
          role="img"
          aria-label="送出"
          className="pointer-events-none absolute inset-0 flex items-center justify-end pr-2"
        >
          <RiSendPlaneLine className="size-5 text-primary-foreground" />
        </span>
      )}
      {writing && !failed && (
        <span
          role="status"
          aria-label="送出中"
          className="pointer-events-none absolute inset-0 flex items-center justify-end pr-2 text-muted-foreground"
        >
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </span>
      )}
      {failed && (
        <span className="absolute inset-0 flex items-center justify-end pr-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRetry?.();
            }}
            className="rounded px-2 py-0.5 text-xs text-destructive ring-1 ring-destructive/50"
          >
            重試
          </button>
        </span>
      )}
    </div>
  );
};

// Single source of truth for the in-progress draft, shared by the Preview and
// the Summary drawer so they never diverge.
export const useEntryDraftPreview = (
  gameId: string,
  mode: ReduxGameState["mode"],
) => {
  const { game } = useGame(gameId);
  const { setIndex } = useAppSelector((state) => state.game);
  const {
    entryDraft: draft,
    status: { isSetInProgress, entryIndex },
  } = useAppSelector((state) => state.game[mode]);

  // a rolled-back optimistic mutate can transiently leave game undefined
  if (!game || !isSetInProgress) return { hasPreview: false as const };

  const { players } = game.teams.home;
  const previousEntry =
    entryIndex > 0 ? game.sets[setIndex]?.entries[entryIndex - 1] : undefined;
  const isEditing = Boolean(draft.home.player?.id) || Boolean(draft.home.type);

  const draftRallyEntry = isEditing
    ? ({
        type: EntryType.RALLY,
        win: draft.win ?? false,
        home: {
          score: draft.home.score,
          type: draft.home.type,
          num: draft.home.num ?? 0,
          ...(draft.home.player ? { player: draft.home.player } : {}),
        },
        away: {
          score: draft.away.score,
          type: draft.away.type,
          num: draft.away.num ?? 0,
          ...(draft.away.player ? { player: draft.away.player } : {}),
        },
      } as unknown as EntryView)
    : null;

  const draftEntry: EntryView | undefined = draft.substitution
    ? {
        type: EntryType.SUBSTITUTION,
        id: draft.id,
        seq: draft.seq,
        ...draft.substitution,
      }
    : draft.timeout
      ? {
          type: EntryType.TIMEOUT,
          id: draft.id,
          seq: draft.seq,
          ...draft.timeout,
        }
      : draft.challenge
        ? {
            type: EntryType.CHALLENGE,
            id: draft.id,
            seq: draft.seq,
            ...draft.challenge,
          }
        : (draftRallyEntry ?? previousEntry);

  const entry = isEditing || entryIndex === 0 ? draftEntry : previousEntry;

  // first entry, before any input: nothing to preview
  if (!entry) return { hasPreview: false as const };

  const { submittable } = getEntryProgress(draft);
  // === true so a valid num === 0 is not read as incomplete
  const isComplete = submittable === true;

  return {
    hasPreview: true as const,
    entry,
    previousEntry,
    players,
    isEditing,
    isComplete,
    entryIndex,
  };
};

export const GamePreview = ({
  gameId,
  mode,
  onSubmit,
  onExpandDrawer,
  className,
}: {
  gameId: string;
  mode: ReduxGameState["mode"];
  onSubmit?: () => void;
  onExpandDrawer?: () => void;
  className?: string;
}) => {
  const dispatch = useAppDispatch();
  const setIndex = useAppSelector((state) => state.game.setIndex);
  const draftId = useAppSelector((state) => state.game[mode].entryDraft.id);
  const pendingWrites = useAppSelector((state) => state.pendingWrites);
  const { flush } = usePendingWrites(gameId, setIndex);
  const preview = useEntryDraftPreview(gameId, mode);
  if (!preview.hasPreview) return null;
  const { entry, previousEntry, players, isEditing, isComplete, entryIndex } =
    preview;

  // D4: the update path doesn't advance optimistically, so unlike create it
  // keeps showing this card until the write resolves -- these are pure
  // projections of the same queue SyncIndicator reads, scoped to this draft's
  // identity.
  const writing = mode === "editing" && isPendingWrite(pendingWrites, draftId);
  const failed = mode === "editing" && hasFailedWrite(pendingWrites, draftId);

  const handleRetry = () => {
    dispatch(pendingWritesActions.retryRequested());
    void flush();
  };

  return (
    <PreviewCard
      // remount per entry to reset the card's freeze/flash state
      key={entryIndex}
      entry={entry}
      previousEntry={previousEntry}
      players={players}
      isEditing={isEditing}
      isPulsing={isEditing && !isComplete}
      isComplete={isComplete}
      writing={writing}
      failed={failed}
      onRetry={mode === "editing" ? handleRetry : undefined}
      onSubmit={onSubmit}
      onExpand={onExpandDrawer}
      className={className}
    />
  );
};
