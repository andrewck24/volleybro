"use client";
import { Entry } from "@/components/game/entry";
import { getEntryProgress } from "@/components/game/panel/entry-progress";
import { Card } from "@/components/ui/card";
import { EntryType } from "@/entities/game";
import { useGame } from "@/hooks/use-data";
import type {
  EntryView,
  GamePlayerView,
  ReduxGameState,
} from "@/lib/features/game/types";
import { useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { RiSendPlaneLine } from "react-icons/ri";

/**
 * Presentational Preview card. The three score-Figures states (idle / undecided
 * / decided) fall out of <Entry>/<Rally> for free from the shape of `entry` --
 * this component only layers the submission feedback on top: a pulse while the
 * draft is incomplete, a ring + send icon once it is complete, and (owned
 * locally, since it is purely a transient UI reaction to a click) a freeze that
 * flashes the background once and demotes the draft to `previousEntry` in
 * place. The container resets this by remounting the card (via `key`) once the
 * real submission advances to the next entry.
 */
export const PreviewCard = ({
  entry,
  previousEntry,
  players,
  isEditing,
  isPulsing,
  isComplete,
  onSubmit,
  onExpand,
  className,
}: {
  entry: EntryView;
  previousEntry: EntryView;
  players: GamePlayerView[];
  isEditing?: boolean;
  isPulsing?: boolean;
  isComplete?: boolean;
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
    if (isEditing && isComplete && !frozen) {
      setFrozen(true);
      setFlashing(true);
      onSubmit?.();
      return;
    }
    if (!isEditing) onExpand?.();
  };

  const shownEntry = frozen ? previousEntry : entry;
  const showSendAffordance = Boolean(isEditing && isComplete && !frozen);

  return (
    <Card
      data-testid="preview-card"
      className={cn(
        "relative grid w-full p-2 transition-colors duration-500",
        flashing && "bg-primary/30",
        className,
      )}
    >
      <div
        data-testid="preview-trigger"
        onClick={handleClick}
        className={cn(isPulsing && !frozen && "animate-pulse duration-1000")}
      >
        <Entry entry={shownEntry} players={players} />
      </div>
      {showSendAffordance && (
        <span
          role="img"
          aria-label="送出"
          className="pointer-events-none absolute inset-0 flex items-center justify-end rounded-lg pr-2 ring-2 ring-primary"
        >
          <RiSendPlaneLine className="size-5 text-primary" />
        </span>
      )}
    </Card>
  );
};

/**
 * Derives the entry-draft state shared by the Preview (this file) and the
 * Summary drawer's in-progress draft row (summary-drawer.tsx) -- the single
 * source of truth for "is input in progress" / "is the draft complete" so the
 * two consumers never diverge on their own copies of these booleans.
 */
export const useEntryDraftPreview = (
  gameId: string,
  mode: ReduxGameState["mode"],
) => {
  const { game } = useGame(gameId);
  const { setIndex } = useAppSelector((state) => state.game);
  const {
    entryDraft: draft,
    status: { inProgress, entryIndex },
  } = useAppSelector((state) => state.game[mode]);

  // Guard a transient undefined game (e.g. a rolled-back optimistic mutate) so
  // the shared Preview hook degrades to "not in progress" instead of crashing.
  if (!game || !inProgress) return { inProgress: false as const };

  const { players } = game.teams.home;
  const lastEntry = game.sets[setIndex].entries[entryIndex - 1];
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
    ? { type: EntryType.SUBSTITUTION, ...draft.substitution }
    : draft.timeout
      ? { type: EntryType.TIMEOUT, ...draft.timeout }
      : draft.challenge
        ? { type: EntryType.CHALLENGE, ...draft.challenge }
        : (draftRallyEntry ?? lastEntry);

  const entry = isEditing || entryIndex === 0 ? draftEntry : lastEntry;

  // Fail safe: derive completeness from getEntryProgress (reused from task
  // group 1, do not duplicate) and check the boolean explicitly so a
  // partially-complete draft never shows the send affordance -- guards
  // against falsy-but-valid values (e.g. num === 0) or type confusion.
  const { submittable } = getEntryProgress(draft);
  const isComplete = submittable === true;

  return {
    inProgress: true as const,
    entry,
    previousEntry: lastEntry,
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
  const preview = useEntryDraftPreview(gameId, mode);
  if (!preview.inProgress) return null;
  const { entry, previousEntry, players, isEditing, isComplete, entryIndex } =
    preview;

  return (
    <PreviewCard
      // Remounts on the next entry so the local freeze/flash state (owned by
      // PreviewCard) always starts fresh once the real submission lands.
      key={entryIndex}
      entry={entry}
      previousEntry={previousEntry}
      players={players}
      isEditing={isEditing}
      isPulsing={isEditing && !isComplete}
      isComplete={isComplete}
      onSubmit={onSubmit}
      onExpand={onExpandDrawer}
      className={className}
    />
  );
};
