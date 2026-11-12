"use client";
import { Entry } from "@/components/game/entry";
import { FailedWriteRetry } from "@/components/game/failed-write-retry";
import { getEntryProgress } from "@/components/game/panel/entry-progress";
import { Spinner } from "@/components/ui/spinner";
import { EntryType } from "@/entities/game";
import { useGame } from "@/hooks/use-data";
import { usePendingWritesContext } from "@/hooks/use-pending-writes";
import {
  hasFailedWrite,
  isPendingWrite,
} from "@/lib/features/game/pending-writes";
import type {
  EntryView,
  GamePlayerView,
  ReduxGameState,
} from "@/lib/features/game/types";
import { useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { RiSendPlaneLine } from "react-icons/ri";

export type PreviewCardProps = {
  hasPreview: true;
  entry: EntryView;
  previousEntry: EntryView | undefined;
  players: GamePlayerView[];
  isEditing: boolean;
  isComplete: boolean;
  entryIndex: number;
  isPulsing?: boolean;
  writing?: boolean;
  failed?: boolean;
  onRetry?: () => void;
  onSubmit?: () => void;
  onExpand?: () => void;
  className?: string;
};

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
}: Omit<PreviewCardProps, "hasPreview" | "entryIndex">) => {
  const [frozen, setFrozen] = useState(false);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (!flashing) return;
    const id = setTimeout(() => setFlashing(false), 500);
    return () => clearTimeout(id);
  }, [flashing]);

  const handleClick = () => {
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
            failed && "ring-1 ring-error pointer-coarse:min-h-(--control-size)",
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
          <Spinner />
        </span>
      )}
      {failed && <FailedWriteRetry onRetry={onRetry} />}
    </div>
  );
};

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

  const identity = { id: draft.id, seq: draft.seq };
  const draftEntry: EntryView | undefined = draft.substitution
    ? { type: EntryType.SUBSTITUTION, ...identity, ...draft.substitution }
    : draft.timeout
      ? { type: EntryType.TIMEOUT, ...identity, ...draft.timeout }
      : draft.challenge
        ? { type: EntryType.CHALLENGE, ...identity, ...draft.challenge }
        : (draftRallyEntry ?? previousEntry);

  const entry = isEditing || entryIndex === 0 ? draftEntry : previousEntry;

  if (!entry) return { hasPreview: false as const };

  const { submittable } = getEntryProgress(draft);
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
  const draftId = useAppSelector((state) => state.game[mode].entryDraft.id);
  const pendingWrites = useAppSelector((state) => state.pendingWrites);
  const { retry } = usePendingWritesContext();
  const preview = useEntryDraftPreview(gameId, mode);
  if (!preview.hasPreview) return null;
  const { entry, previousEntry, players, isEditing, isComplete, entryIndex } =
    preview;

  const writing = mode === "editing" && isPendingWrite(pendingWrites, draftId);
  const failed = mode === "editing" && hasFailedWrite(pendingWrites, draftId);

  return (
    <PreviewCard
      key={entryIndex}
      entry={entry}
      previousEntry={previousEntry}
      players={players}
      isEditing={isEditing}
      isPulsing={isEditing && !isComplete}
      isComplete={isComplete}
      writing={writing}
      failed={failed}
      onRetry={mode === "editing" ? () => void retry() : undefined}
      onSubmit={onSubmit}
      onExpand={onExpandDrawer}
      className={className}
    />
  );
};
